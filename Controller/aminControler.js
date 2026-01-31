import User from '../Models/UserModel.js';
import transporter from '../Config/nodemailerAuth.js';

// Create user (Admin only)
export const addUer = async (req, res) => {
    try {
        const { name, email, phone, role } = req.body;

        // Validation
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name and email'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Validate role
        const userRole = role && ['user', 'admin'].includes(role) ? role : 'user';

        // Create user without password (will be set when they accept role)
        const user = await User.create({
            name,
            email,
            phone,
            role: userRole
        });

        // Send role invitation email
        try {
            const inviteURL = `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/v1/auth/role-setup/${user._id}`;

            const mailOptions = {
                to: email,
                subject: 'Role Assigned - Internal Polling System',
                text: `Hello ${name},\n\nYou have been assigned the role of ${userRole}.\n\nSet up your account by visiting the following link: ${inviteURL}\n\nBest regards,\nInternal Polling Management System Team`
            };
            await transporter.sendMail(mailOptions);
            console.log(`Invitation email sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'User created successfully. Invitation email sent.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Add user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating user',
            error: error.message
        });
    }
};
