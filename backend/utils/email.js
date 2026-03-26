const nodemailer = require('nodemailer');
const db = require('../config/db');

// 创建邮件传输器
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
};

// 生成6位验证码
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 发送验证码邮件
const sendVerifyCode = async (email, type = 'login') => {
  try {
    // 检查是否频繁发送（60秒内）
    const cacheKey = `verify_code:${email}`;
    const existing = await db.getCache(cacheKey);
    
    if (existing) {
      const elapsed = Math.floor((Date.now() - existing.timestamp) / 1000);
      if (elapsed < 60) {
        return {
          success: false,
          message: `请${60 - elapsed}秒后再试`
        };
      }
    }

    const code = generateCode();
    
    // 存储验证码到 Redis（5分钟过期）
    await db.setCache(cacheKey, {
      code,
      type,
      timestamp: Date.now(),
      attempts: 0
    }, 300);

    // 如果没有配置SMTP，直接返回验证码（开发模式）
    if (!process.env.SMTP_USER) {
      console.log(`📧 开发模式验证码 [${email}]: ${code}`);
      return {
        success: true,
        message: '验证码已发送（开发模式查看控制台）',
        devCode: code // 开发模式返回验证码
      };
    }

    // 发送邮件
    const transporter = createTransporter();
    const typeText = type === 'login' ? '登录' : '注册';
    
    await transporter.sendMail({
      from: `"Phemex" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Phemex ${typeText}验证码`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #00d4aa;">Phemex</h2>
          <p>您好！</p>
          <p>您的${typeText}验证码是：</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333; margin: 20px 0;">
            ${code}
          </div>
          <p>验证码5分钟内有效，请勿泄露给他人。</p>
          <p style="color: #999; font-size: 12px;">如非本人操作，请忽略此邮件。</p>
        </div>
      `
    });

    return {
      success: true,
      message: '验证码已发送'
    };
  } catch (err) {
    console.error('发送验证码失败:', err);
    return {
      success: false,
      message: '发送失败，请稍后重试'
    };
  }
};

// 验证验证码
const verifyCode = async (email, code, type = 'login') => {
  try {
    const cacheKey = `verify_code:${email}`;
    const cached = await db.getCache(cacheKey);

    if (!cached) {
      return {
        success: false,
        message: '验证码已过期'
      };
    }

    if (cached.type !== type) {
      return {
        success: false,
        message: '验证码类型错误'
      };
    }

    // 检查尝试次数
    if (cached.attempts >= 5) {
      await db.delCache(cacheKey);
      return {
        success: false,
        message: '验证失败次数过多，请重新获取'
      };
    }

    // 验证 code
    if (cached.code !== code) {
      // 增加尝试次数
      cached.attempts += 1;
      await db.setCache(cacheKey, cached, 300);
      
      return {
        success: false,
        message: '验证码错误'
      };
    }

    // 验证成功，删除缓存
    await db.delCache(cacheKey);

    return {
      success: true,
      message: '验证成功'
    };
  } catch (err) {
    console.error('验证验证码失败:', err);
    return {
      success: false,
      message: '验证失败'
    };
  }
};

module.exports = {
  sendVerifyCode,
  verifyCode
};