import * as amqp from 'amqplib/callback_api'

export interface PubMessageContent {
  userId: string;
  [propName: string]: any;
}

export interface PubMessage {
  event: string;
  content: PubMessageContent;
  action: string;
}

interface Payload extends PubMessage{
  usrId: string;
  orgIds: string[];
}

export class RabbitPub {

  private _ch: amqp.Channel;
  private RT_EX = 'realtime_exchange_v2';
  private TASK_QUEUE = 'task_queue';

  private static _instance: RabbitPub = new RabbitPub();

  constructor() {
    if (RabbitPub._instance) {
      throw new Error("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
    }
    this.connect();
    RabbitPub._instance = this;
  }

  public static getInstance(): RabbitPub {
    return RabbitPub._instance;
  }

  public connect(): void {
    let rabbitURL = process.env.RABBIT_URL || 'amqp://usr:pwd@localhost';
    amqp.connect(rabbitURL, (err, conn) => {
      if (err) {
        console.error(err);
        console.error('=> Rabittmq could not start');
      } else if (conn) {
        conn.createChannel((err, ch) => {
          if (err) console.error(err);
          ch.assertExchange(this.RT_EX, 'topic', {durable: true}, (err, ok) => {
            if (err) console.error(err);
            ch.assertQueue(this.TASK_QUEUE, {durable: true, messageTtl: 5000}, (err, ok) => {
              if (err) console.error(err);
              this._ch = ch;
            });
          });
        });
      }
    });
  }

  public pub(msg: PubMessage, usrId?: string, orgIds?: string[]) {
    if (!this._ch) return;
    const payload = msg as Payload;
    payload.usrId = usrId !== undefined ? usrId : (msg.content.userId || msg.content.organizationId).toString();
    let rk = payload.usrId;
    if (orgIds !== undefined) {
      if (orgIds === null) {
        return this._ch.sendToQueue(this.TASK_QUEUE, Buffer.from(JSON.stringify(payload), 'utf8'),  {persistent: true});
      }
      payload.orgIds = orgIds;
      rk = `${rk}.${orgIds.join('.')}`;
    }
    console.log(rk);
    return this._ch.publish(this.RT_EX, rk, Buffer.from(JSON.stringify(payload), 'utf8'));
  }
}


