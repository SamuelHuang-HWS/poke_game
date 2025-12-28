// server/middleware/validation.js
const Joi = require("joi");

/**
 * 注册验证中间件
 */
function validateRegister(req, res, next) {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(2).max(20).required().messages({
      "string.alphanum": "用户名只能包含字母和数字",
      "string.min": "用户名长度不能少于2位",
      "string.max": "用户名长度不能超过20位",
      "any.required": "用户名不能为空",
    }),
    phoneNumber: Joi.string()
      .pattern(/^1[3-9]\d{9}$/)
      .required()
      .messages({
        "string.pattern.base": "请输入有效的手机号码",
        "any.required": "手机号码不能为空",
      }),
    password: Joi.string().min(6).max(20).required().messages({
      "string.min": "密码长度不能少于6位",
      "string.max": "密码长度不能超过20位",
      "any.required": "密码不能为空",
    }),
    deviceId: Joi.string().optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    // 特殊处理管理员账户
    if (req.body.phoneNumber === "adminhws") {
      const adminSchema = Joi.object({
        username: Joi.string().alphanum().min(2).max(20).required().messages({
          "string.alphanum": "用户名只能包含字母和数字",
          "string.min": "用户名长度不能少于2位",
          "string.max": "用户名长度不能超过20位",
          "any.required": "用户名不能为空",
        }),
        phoneNumber: Joi.string().required(),
        password: Joi.string().min(6).max(20).required().messages({
          "string.min": "密码长度不能少于6位",
          "string.max": "密码长度不能超过20位",
          "any.required": "密码不能为空",
        }),
        deviceId: Joi.string().optional(),
      });

      const adminError = adminSchema.validate(req.body);
      if (adminError.error) {
        return res.status(400).json({
          success: false,
          message: adminError.error.details[0].message,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
  }

  next();
}

/**
 * 登录验证中间件
 */
function validateLogin(req, res, next) {
  const schema = Joi.object({
    phoneNumber: Joi.string().required().messages({
      "any.required": "手机号码/用户名不能为空",
    }),
    password: Joi.string().required().messages({
      "any.required": "密码不能为空",
    }),
    deviceId: Joi.string().optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
}

/**
 * 创建房间验证中间件
 */
function validateCreateRoom(req, res, next) {
  const schema = Joi.object({
    baseBet: Joi.number().valid(1, 2, 5).required().messages({
      "any.only": "单注倍数必须是1、2或5",
      "any.required": "单注倍数不能为空",
    }),
    totalRounds: Joi.number().valid(10, 20, 50).required().messages({
      "any.only": "房间局数必须是10、20或50",
      "any.required": "房间局数不能为空",
    }),
    password: Joi.string().allow("").max(20).optional().messages({
      "string.max": "密码长度不能超过20位",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
}

/**
 * 搜索房间验证中间件
 */
function validateSearchRoom(req, res, next) {
  const schema = Joi.object({
    roomId: Joi.string().required().messages({
      "any.required": "房间号不能为空",
    }),
  });

  const { error } = schema.validate(req.params);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
}

/**
 * 加入房间验证中间件
 */
function validateJoinRoom(req, res, next) {
  const schema = Joi.object({
    roomId: Joi.string().required().messages({
      "any.required": "房间号不能为空",
    }),
    password: Joi.string().allow("").max(20).optional().messages({
      "string.max": "密码长度不能超过20位",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateRoom,
  validateSearchRoom,
  validateJoinRoom,
};
