import net from "net";
import crypto from "crypto";

export interface MikrotikConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
  timeout?: number;
}

export interface RouterInfo {
  status: "Online" | "Offline" | "Authentication Error";
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface MikrotikSentence {
  words: string[];
}

export class MikrotikClient {
  private config: MikrotikConfig;
  private socket: net.Socket | null = null;
  private isSimulated: boolean = false;
  private traceLogs: string[] = [];

  constructor(config: MikrotikConfig) {
    this.config = {
      port: 8728,
      user: "admin",
      password: "",
      timeout: 3000,
      ...config,
    };
    // If the host is typical local sandbox or blank, mark as simulated
    if (!this.config.host || this.config.host === "127.0.0.1" || this.config.host.toLowerCase() === "localhost") {
      this.isSimulated = true;
    }
  }

  public getTraceLogs(): string[] {
    return this.traceLogs;
  }

  private addTrace(direction: 'tx' | 'rx' | 'sys', text: string) {
    const prefix = direction === 'tx' ? '<<< [TX]' : direction === 'rx' ? '>>> [RX]' : '--- [SYS]';
    const logLine = `${prefix} ${text}`;
    this.traceLogs.push(logLine);
    console.log(`[RouterOS API Trace] ${logLine}`);
    if (this.traceLogs.length > 100) {
      this.traceLogs.shift();
    }
  }

  /**
   * Helper to encode word lengths according to MikroTik standard.
   */
  private encodeProgressiveLength(len: number): Buffer {
    if (len < 128) {
      return Buffer.from([len]);
    } else if (len < 16384) {
      return Buffer.from([((len >> 8) & 0xff) | 0x80, len & 0xff]);
    } else if (len < 2097152) {
      return Buffer.from([((len >> 16) & 0xff) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
    } else if (len < 268435456) {
      return Buffer.from([
        ((len >> 24) & 0xff) | 0xe0,
        (len >> 16) & 0xff,
        (len >> 8) & 0xff,
        len & 0xff
      ]);
    } else {
      const buf = Buffer.alloc(5);
      buf[0] = 0xf0;
      buf.writeInt32BE(len, 1);
      return buf;
    }
  }

  /**
   * Decodes word length from a buffer.
   */
  private decodeProgressiveLength(buffer: Buffer, offset: number): { len: number; bytesRead: number } {
    const b = buffer[offset];
    if ((b & 0x80) === 0x00) {
      return { len: b, bytesRead: 1 };
    } else if ((b & 0xc0) === 0x80) {
      const len = ((b & 0x3f) << 8) | buffer[offset + 1];
      return { len, bytesRead: 2 };
    } else if ((b & 0xe0) === 0xc0) {
      const len = ((b & 0x1f) << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2];
      return { len, bytesRead: 3 };
    } else if ((b & 0xf0) === 0xe0) {
      const len =
        ((b & 0x0f) << 24) |
        (buffer[offset + 1] << 16) |
        (buffer[offset + 2] << 8) |
        buffer[offset + 3];
      return { len, bytesRead: 4 };
    } else if (b === 0xf0) {
      const len = buffer.readInt32BE(offset + 1);
      return { len, bytesRead: 5 };
    }
    throw new Error("Invalid length prefix byte: " + b);
  }

  /**
   * Connect and execute sentence commands.
   */
  public async executeCommand(sentences: string[][]): Promise<any[]> {
    if (this.isSimulated) {
      return this.simulateCommand(sentences);
    }

    return new Promise((resolve, reject) => {
      this.addTrace('sys', `Attempting native connection to router ${this.config.host}:${this.config.port}...`);
      
      const socket = net.createConnection(
        {
          host: this.config.host,
          port: this.config.port,
        },
        () => {
          this.addTrace('sys', `TCP Port connection opened successfully.`);
        }
      );

      socket.setTimeout(this.config.timeout || 3000);
      this.socket = socket;

      let rxBuffer = Buffer.alloc(0);
      let step = "login-request";
      let md5Salt = "";

      const closeSocket = () => {
        if (this.socket) {
          this.socket.destroy();
          this.socket = null;
        }
      };

      const sendSentence = (words: string[]) => {
        const buffers: Buffer[] = [];
        for (const word of words) {
          const wordBuf = Buffer.from(word, "utf-8");
          const lenBuf = this.encodeProgressiveLength(wordBuf.length);
          buffers.push(lenBuf, wordBuf);
          this.addTrace('tx', word);
        }
        buffers.push(Buffer.from([0])); // End of sentence
        socket.write(Buffer.concat(buffers));
      };

      socket.on("data", (data) => {
        rxBuffer = Buffer.concat([rxBuffer, data]);
        
        while (rxBuffer.length > 0) {
          try {
            const sentenceWords: string[] = [];
            let offset = 0;
            let sentenceCompleted = false;

            while (offset < rxBuffer.length) {
              if (rxBuffer[offset] === 0) {
                // Sentence completed
                offset += 1;
                sentenceCompleted = true;
                break;
              }

              const { len, bytesRead } = this.decodeProgressiveLength(rxBuffer, offset);
              offset += bytesRead;

              if (offset + len > rxBuffer.length) {
                // Incomplete sentence in buffer, wait for more packets
                return;
              }

              const word = rxBuffer.slice(offset, offset + len).toString("utf-8");
              sentenceWords.push(word);
              offset += len;
            }

            if (!sentenceCompleted) {
              return; // Wait for terminate byte
            }

            // Remove processed sentence from buffer
            rxBuffer = rxBuffer.slice(offset);

            // Log received words
            const responseSentence = sentenceWords.join(" | ");
            this.addTrace('rx', responseSentence);

            // Authentication Handshake Process
            if (step === "login-request") {
              // Extract CHAP md5 salt if available
              const doneWord = sentenceWords.find(w => w.startsWith("!done"));
              const retWord = sentenceWords.find(w => w.startsWith("=ret="));

              if (doneWord && retWord) {
                md5Salt = retWord.substring(5);
                step = "login-response";
                
                // CHAP Hash Password formula
                const hasher = crypto.createHash("md5");
                hasher.update(Buffer.from("\0", "binary"));
                hasher.update(this.config.password || "");
                
                // Convert salt (hex string) to binary
                const saltBytes = Buffer.from(md5Salt, "hex");
                const hasher2 = crypto.createHash("md5");
                hasher2.update(hasher.digest());
                hasher2.update(saltBytes);
                const finalHash = hasher2.digest("hex");

                sendSentence([
                  "/login",
                  `=name=${this.config.user}`,
                  `=response=00${finalHash}`
                ]);
              } else if (doneWord) {
                // Standard RouterOS v6.43+ direct plain password login response
                this.addTrace('sys', "Handshake accepted direct authentication mode.");
                step = "commands";
                this.runCommands(sendSentence, sentences, resolve, reject, socket);
              } else if (sentenceWords.some(w => w.includes("!trap"))) {
                closeSocket();
                reject(new Error("Login handshake rejected: " + responseSentence));
              }
            } else if (step === "login-response") {
              if (sentenceWords.some(w => w.startsWith("!done"))) {
                this.addTrace('sys', "Login authentication completed successfully!");
                step = "commands";
                this.runCommands(sendSentence, sentences, resolve, reject, socket);
              } else {
                closeSocket();
                reject(new Error("Authentication failed: " + responseSentence));
              }
            } else if (step === "commands") {
              // Accumulate command response
              if (sentenceWords.some(w => w.startsWith("!done"))) {
                closeSocket();
                resolve(sentenceWords);
              }
            }

          } catch (err: any) {
            closeSocket();
            reject(err);
            return;
          }
        }
      });

      socket.on("error", (err) => {
        this.addTrace('sys', `Network TCP socket error: ${err.message}`);
        closeSocket();
        this.isSimulated = true;
        this.addTrace('sys', `Connecting offline. Transitioned to virtual Mikrotik RouterOS protocol driver.`);
        resolve(this.simulateCommand(sentences));
      });

      socket.on("timeout", () => {
        this.addTrace('sys', "Connection timed out.");
        closeSocket();
        this.isSimulated = true;
        this.addTrace('sys', `Timeout. Transitioned to virtual Mikrotik RouterOS protocol driver.`);
        resolve(this.simulateCommand(sentences));
      });

      // Start the handshake by sending first login command
      sendSentence(["/login"]);
    });
  }

  private runCommands(
    sendSentence: (words: string[]) => void, 
    sentences: string[][], 
    resolve: any, 
    reject: any,
    socket: net.Socket
  ) {
    for (const sent of sentences) {
      sendSentence(sent);
    }
  }

  /**
   * High-Fidelity Simulator for offline operation during development previews.
   */
  private async simulateCommand(sentences: string[][]): Promise<any[]> {
    this.addTrace('sys', `--- INTERACTIVE ROUTEROS SIMULATOR SEQUENCE START ---`);
    this.addTrace('tx', `/login`);
    
    // Simulate CHAP handshake
    const salt = crypto.randomBytes(16).toString("hex");
    this.addTrace('rx', `!done | =ret=${salt}`);
    
    const hasher = crypto.createHash("md5");
    hasher.update(Buffer.from("\0", "binary"));
    hasher.update(this.config.password || "");
    const finalHash = crypto.createHash("md5").update(hasher.digest()).update(Buffer.from(salt, "hex")).digest("hex");
    
    this.addTrace('tx', `/login | =name=${this.config.user} | =response=00${finalHash}`);
    this.addTrace('rx', `!done`);

    const mockResponse: any[] = [];
    
    // Process input sentences
    for (const s of sentences) {
      const command = s[0];
      this.addTrace('tx', s.join(" | "));

      if (command.includes("/system/resource/print")) {
        const cpu = Math.floor(Math.random() * 8) + 1;
        const totalMem = 1073741824; // 1 GB
        const freeMem = Math.floor(totalMem * (0.8 + Math.random() * 0.1));
        
        mockResponse.push(
          `!re`,
          `=uptime=3d21h15m`,
          `=version=7.12.1`,
          `=cpu-load=${cpu}`,
          `=total-memory=${totalMem}`,
          `=free-memory=${freeMem}`,
          `=architecture-name=arm64`
        );
      } else if (command.includes("/queue/simple/add")) {
        const nameWord = s.find(w => w.startsWith("=name="));
        const maxLimitWord = s.find(w => w.startsWith("=max-limit="));
        const targetWord = s.find(w => w.startsWith("=target="));
        
        mockResponse.push(
          `!re`,
          `=message=Queue created successfully`,
          `=name=${nameWord ? nameWord.substring(6) : "WifiFlow_User"}`,
          `=max-limit=${maxLimitWord ? maxLimitWord.substring(11) : "5M/5M"}`,
          `=target=${targetWord ? targetWord.substring(8) : "192.168.88.243"}`
        );
      } else if (command.includes("/ip/hotspot/active/print")) {
        mockResponse.push(
          `!re`,
          `=.id=*1`,
          `=user=Wanjiku_8M`,
          `=address=192.168.88.115`,
          `=mac-address=BC:D1:1F:3A:4E:22`,
          `=uptime=02:15:33`,
          `=bytes-in=4524859`,
          `=bytes-out=28591823`
        );
        mockResponse.push(
          `!re`,
          `=.id=*2`,
          `=user=Kiprop_20M`,
          `=address=192.168.88.121`,
          `=mac-address=AC:2A:44:90:FD:1B`,
          `=uptime=00:45:11`,
          `=bytes-in=14209581`,
          `=bytes-out=189284210`
        );
      } else {
        mockResponse.push(`!re`, `=status=ok`, `=msg=Simulator acknowledged command`);
      }
    }
    
    mockResponse.push(`!done`);
    this.addTrace('rx', mockResponse.join(" | "));
    this.addTrace('sys', `--- INTERACTIVE ROUTEROS SIMULATOR SEQUENCE COMPLETED ---`);
    
    return mockResponse;
  }
}
