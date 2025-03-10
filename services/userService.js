import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';
import ApiError from '../utils/apiError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import { sanitizeUser } from '../utils/sanitizeData.js';
import User from '../models/userModel.js';

// @desc    Get all Users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    const features = new ApiFeatures(User.find({ role: { $ne: 'admin' } }), req.query)
        .filter()
        .sort()
        .limitFields()
        .search(['name', 'email'])
        .paginate(totalUsers);

    const users = await features.mongooseQuery.exec();

    res.status(200).json({
        success: true,
        pagination: features.paginationResult,
        data: users.map(sanitizeUser)
    });
});

// @desc    Get a user
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
        return next(new ApiError(`No user for this id: ${id}`, 404));
    }

    res.status(200).json({
        data: sanitizeUser(user)
    });
});

// @desc    Update specific user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res, next) => {
    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            slug: slugify(req.body.name),
            email: req.body.email,
            role: req.body.role,
        },
        { new: true, runValidators: true }
    );

    if (!user) {
        return next(new ApiError(`There is no user found with this ID: ${req.params.id}`, 404));
    }

    res.status(200).json({
        data: sanitizeUser(user)
    });
});

// @desc    Change user password
// @route   PUT /api/users/:id
// @access  Private/User
export const changePassword = asyncHandler(async (req, res, next) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            password: hashedPassword,
            passwordChangedAt: Date.now()
        },
        { new: true, runValidators: true }
    );

    if (!user) {
        return next(new ApiError(`There is no user found with ID: ${req.params.id}`, 404));
    }

    res.status(200).json({
        status: 'success',
        message: 'Password changed successfully'
    });
});

// @desc    Delete a user
// @route   Delete /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
        return next(new ApiError(`No user for this id: ${id}`, 404));
    }

    res.status(200).end();
});

// @desc    Get Logged user data
// @route   GET /api/users/getMe
// @access  Private/Protect
export const getLoggedUserData = asyncHandler(async (req, res, next) => {
    req.params.id = req.user._id;
    next();
});

// @desc    Update logged user data (without password, role)
// @route   PUT /api/users/updateMe
// @access  Private/Protect
export const updateLoggedUserData = asyncHandler(async (req, res, next) => {
    const updatedUser = await User.findByIdAdndUpdate(
        req.user._id,
        {
            name: req.body.name,
            email: req.body.email,
            profileImage: req.body.profileImage
        },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        data: sanitizeUser(updatedUser)
    });
});