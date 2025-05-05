const express = require("express");
const contact = require("../controllers/contact.controller");

const router = express.Router();

router.post("/", contact.create);
router.post("/bulk", contact.createMany);
router.get("/", contact.getAll);
router.get("/:id", contact.getById);
router.put("/:id", contact.update);
router.delete("/:id", contact.delete);

module.exports = router;