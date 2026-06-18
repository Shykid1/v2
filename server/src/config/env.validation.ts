import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4000),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Auth
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRY_HOURS: Joi.number().default(24),

  // Paystack
  PAYSTACK_SECRET_KEY: Joi.string().allow('').default(''),
  PAYSTACK_PUBLIC_KEY: Joi.string().allow('').default(''),
  PAYSTACK_BASE_URL: Joi.string().uri().default('https://api.paystack.co'),
  PAYSTACK_WEBHOOK_SECRET: Joi.string().allow('').default(''),

  // Arkesel (WhatsApp + SMS + USSD)
  ARKESEL_API_KEY: Joi.string().allow('').default(''),
  ARKESEL_SENDER_ID: Joi.string().default('SaniChain'),
  ARKESEL_SMS_URL: Joi.string()
    .uri()
    .default('https://sms.arkesel.com/api/v2/sms/send'),
  ARKESEL_WHATSAPP_URL: Joi.string()
    .uri()
    .default('https://sms.arkesel.com/api/v2/whatsapp/send'),
  USSD_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // Sensor HMAC
  HMAC_REPLAY_WINDOW_MS: Joi.number().default(300000),

  // Climate
  CLIMATE_MOCK_MODE: Joi.boolean().default(true),
  CHIRPS_API_URL: Joi.string().uri().allow('').optional(),
  GLOFAS_API_URL: Joi.string().uri().allow('').optional(),
  GLOFAS_API_KEY: Joi.string().allow('').optional(),
  SPEI_API_URL: Joi.string().uri().allow('').optional(),
  DISTRICTS: Joi.string().allow('').optional(),

  // GhanaPost GPS (placeholder)
  GHANAPOST_GPS_API_URL: Joi.string().uri().allow('').optional(),
  GHANAPOST_GPS_API_KEY: Joi.string().allow('').optional(),

  // Seed
  SEED_ADMIN_PASSWORD: Joi.string().optional(),
}).options({ allowUnknown: true });
