const express = require("express");
const messageFlowController = require("../controllers/messageFlow.controller");

const router = express.Router();

router.post("/", messageFlowController.create);
router.get("/", messageFlowController.getAll);
router.get("/:id", messageFlowController.getById);
router.put("/:id", messageFlowController.update);
router.delete("/:id", messageFlowController.delete);

module.exports = router;