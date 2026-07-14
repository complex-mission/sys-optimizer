// 留言反馈的 SMTP 发信。transporter 惰性单例,配置读 env.ts。
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

let transporter: Transporter | null = null;

export function feedbackEnabled(): boolean {
  return !!env.smtpHost;
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
  }
  return transporter;
}

export interface FeedbackMail {
  name: string;
  email: string;
  message: string;
  locale: string;
  ip: string;
  userAgent: string;
}

export async function sendFeedbackMail(fb: FeedbackMail): Promise<void> {
  const who = fb.name || "匿名用户";
  const lines = [
    `来源:SysOptimizer 官网留言表单(${fb.locale})`,
    `称呼:${who}`,
    `邮箱:${fb.email || "(未填写)"}`,
    `时间:${new Date().toISOString()}`,
    `IP:${fb.ip}`,
    `UA:${fb.userAgent}`,
    "",
    "—— 留言内容 ——",
    "",
    fb.message,
  ];

  await getTransporter().sendMail({
    from: env.feedbackFrom,
    to: env.feedbackTo,
    subject: `[SysOptimizer 反馈] 来自 ${who}`,
    text: lines.join("\n"),
    // 填了邮箱就可直接回信
    ...(fb.email ? { replyTo: fb.email } : {}),
  });
}
