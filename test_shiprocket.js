import dotenv from 'dotenv';
dotenv.config();
import shiprocketService from './src/services/shiprocket.service.js';

async function test() {
  try {
    const cost = await shiprocketService.getShippingCost({
      delivery_pincode: "110001", // Delhi
      weight: 0.5,
      cod: 0,
      order_amount: 500
    });
    console.log("Shipping Cost:", cost);
  } catch (error) {
    console.error("Test Failed:", error);
  }
}

test();
