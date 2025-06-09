const express = require("express");
const conversation = require("../controllers/conversation.controller");

const router = express.Router();

router.get("/", conversation.getAll);
router.get("/:id", conversation.getById);

module.exports = router;