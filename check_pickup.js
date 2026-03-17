import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const email = process.env.SHIPROCKET_EMAIL;
const password = process.env.SHIPROCKET_PASSWORD;
const baseUrl = process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in";

(async () => {
    try {
        const login = await axios.post(`${baseUrl}/v1/external/auth/login`, {
            email: email.trim(),
            password: password.trim().replace(/^"|"$/g, '')
        });
        const token = login.data.token;
        const res = await axios.get(`${baseUrl}/v1/external/settings/get/pickup`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
})();
