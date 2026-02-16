import express from "express";
import {
  addAddress,
  getMyAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/address.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addressValidation } from "../validations/address.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/add", validate(addressValidation), addAddress);
router.get("/my-addresses", getMyAddresses);
router.get("/:id", getAddressById);
router.put("/update/:id", validate(addressValidation), updateAddress);
router.delete("/delete/:id", deleteAddress);
router.put("/set-default/:id", setDefaultAddress);

export default router;
