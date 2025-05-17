const express = require("express");
const authorizationRoles = require("../middlewares/authorizationRoles");
const validateToken = require("../middlewares/validateToken");

const {
  getUsers,
  getUserByID,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const router = express.Router();

router.get("/users", validateToken, authorizationRoles("admin"), getUsers);
router.get(
  "/user/:id",
  validateToken,
  authorizationRoles("user", "admin"),
  getUserByID
);
router.put(
  "/user/:id",
  validateToken,
  authorizationRoles("user", "admin"),
  updateUser
);
router.delete(
  "/user/:id",
  validateToken,
  authorizationRoles("admin"),
  deleteUser
);

module.exports = router;
