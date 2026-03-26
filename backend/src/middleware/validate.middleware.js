export function validate(schema) {
    return (req, res, next) => {
      try {
        const parsed = schema.parse({
          body: req.body,
          query: req.query,
          params: req.params
        });
  
        req.validated = parsed;
        next();
      } catch (err) {
        return res.status(400).json({
          error: "ValidationError",
          details: err.errors
        });
      }
    };
  }