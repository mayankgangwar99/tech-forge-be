import { Request, Response, NextFunction } from "express";
import { ZodError, ZodTypeAny } from "zod";

export type ValidationSchema = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export const validate = (schema: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      if (schema.query) {
        await schema.query.parseAsync(req.query);
      }

      if (schema.params) {
        const parsedParams = await schema.params.parseAsync(req.params);
        req.params = parsedParams as Request["params"];
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.flatten(),
        });
      }

      return next(error);
    }
  };
};
