const express = require("express");
const botMessageFlow = require("../controllers/botMessageFlow.controller");

const router = express.Router();

router.post("/", botMessageFlow.create);
router.get("/", botMessageFlow.getAll);
router.get("/:id", botMessageFlow.getById);
router.put("/:id", botMessageFlow.update);
router.delete("/:id", botMessageFlow.delete);

module.exports = router;