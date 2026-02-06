import User from '../models/User.js';
import { uploadOnCloudinary } from '../config/cloudinary.js';
import bcrypt from 'bcryptjs';

export const registerAdmin = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            additional_phone,
            business_name,
            business_email,
            business_phone,
            gst_number,
            pan_number,
            kyc_document_type,
            kyc_document_number,
            is_active,
            is_verified,
            address_id
        } = req.body;

        // Validation
        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: name, email, password, and phone are required."
            });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let profileData = {
            url: "",
            public_id: "",
            initials: name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : ""
        };
        let kycFrontUrl = "";
        let kycBackUrl = "";

        if (req.files?.profile_image?.[0]) {
            const result = await uploadOnCloudinary(req.files.profile_image[0].path);
            if (result) {
                profileData.url = result.secure_url;
                profileData.public_id = result.public_id;
            }
        }

        if (req.files?.kyc_document_front?.[0]) {
            const result = await uploadOnCloudinary(req.files.kyc_document_front[0].path);
            if (result) kycFrontUrl = result.secure_url;
        }
        if (req.files?.kyc_document_back?.[0]) {
            const result = await uploadOnCloudinary(req.files.kyc_document_back[0].path);
            if (result) kycBackUrl = result.secure_url;
        }
        const admin = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            additional_phone,
            user_type: 'admin',
            profile: profileData,
            business_name,
            business_email,
            business_phone,
            gst_number,
            pan_number,
            kyc_document_type,
            kyc_document_number,
            kyc_document_front: kycFrontUrl,
            kyc_document_back: kycBackUrl,
            kyc_status: 'pending',
            is_active: is_active === 'false' ? false : true,
            is_verified: is_verified === 'false' ? false : true,
            address_id: address_id || null
        });

        const userResponse = admin.toJSON();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: "Admin registered successfully",
            data: userResponse
        });

    } catch (error) {
        console.error("Admin registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
