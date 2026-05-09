import { Router, type IRouter } from "express";
import textRouter from "./text";
import chatRouter from "./chat";
import codeRouter from "./code";
import imageRouter from "./image";
import modelsRouter from "./models";
import rulesRouter from "./rules";
import openaiCompatRouter from "./openai-compat";

const router: IRouter = Router();

router.use(openaiCompatRouter); // OpenAI-compatible at /v1/chat/completions
router.use(textRouter);
router.use(chatRouter);
router.use(codeRouter);
router.use(imageRouter);
router.use(modelsRouter);
router.use(rulesRouter);

export default router;
