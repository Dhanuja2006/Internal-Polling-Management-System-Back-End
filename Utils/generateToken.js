import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const generateToken = (id , res) => {
    const token = jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '8h',
    });

    res.cookie('token', token, {
        httpOnly: true ,
        sameSite: 'strict',
        maxAga: 8*60*60*1000
    })
}

export default generateToken;