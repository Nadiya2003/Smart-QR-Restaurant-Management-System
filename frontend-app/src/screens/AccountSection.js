import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
    ScrollView,
    Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';
import { validateEmail, validatePhone, validateFullName, validateBankAccount } from '../utils/validation';

const AccountSection = () => {
    const { user, token, logout } = useAuth();
    const [fullName, setFullName] = useState(user?.full_name || user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [bankName, setBankName] = useState(user?.bank_name || '');
    const [accountNumber, setAccountNumber] = useState(user?.account_number || '');
    const [accountName, setAccountName] = useState(user?.account_name || '');
    const [profileImage, setProfileImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0]);
        }
    };

    const handleUpdateProfile = async () => {
        if (!validateFullName(fullName)) {
            Alert.alert('Invalid Name', 'Full name must be at least 3 characters');
            return;
        }
        const emailCheck = validateEmail(email);
        if (!emailCheck.isValid) {
            Alert.alert('Invalid Email', emailCheck.error);
            return;
        }
        if (phone && !validatePhone(phone)) {
            Alert.alert('Invalid Phone', 'Please enter a valid Sri Lankan phone number');
            return;
        }
        if (accountNumber && !validateBankAccount(accountNumber)) {
            Alert.alert('Invalid Account', 'Account number must be 8-15 digits');
            return;
        }

        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('full_name', fullName.trim());
            formData.append('email', email.trim());
            formData.append('phone', phone.trim());
            formData.append('bank_name', bankName.trim());
            formData.append('account_number', accountNumber.trim());
            formData.append('account_name', accountName.trim());

            if (profileImage) {
                const uri = profileImage.uri;
                const uriParts = uri.split('.');
                const fileType = uriParts[uriParts.length - 1] || 'jpeg';

                if (Platform.OS === 'web') {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    formData.append('profile_image', blob, `profile.${fileType}`);
                } else {
                    formData.append('profile_image', {
                        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                        name: `profile.${fileType}`,
                        type: `image/${fileType}`,
                    });
                }
            }

            const res = await fetch(`${apiConfig.STAFF.PROFILE}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                Alert.alert('Success ✅', 'Your profile has been updated. Some changes may require re-login to reflect everywhere.');
                setProfileImage(null);
                // In a real app, you might want to update the context here
            } else {
                Alert.alert('Update Failed', data.message || 'Error updating profile');
            }
        } catch (error) {
            console.error('Update profile error:', error);
            Alert.alert('Network Error', 'Failed to connect to the server.');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return '#10B981';
            case 'pending': return '#F59E0B';
            case 'disabled': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const userImg = user?.profile_image || user?.image || user?.steward_image;
    const displayImage = profileImage 
        ? profileImage.uri 
        : (userImg 
            ? (userImg.startsWith('http') ? userImg : `${apiConfig.API_BASE_URL}${userImg.startsWith('/') ? '' : '/'}${userImg}`)
            : null);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Account</Text>
                <Text style={styles.headerSubtitle}>Manage your professional profile</Text>
            </View>

            <View style={styles.profileCard}>
                {/* Photo Section */}
                <View style={styles.imageSection}>
                    <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
                        {displayImage ? (
                            <Image source={{ uri: displayImage }} style={styles.profileImg} />
                        ) : (
                            <View style={styles.initialsCircle}>
                                <Text style={styles.initialsText}>
                                    {(user?.name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.cameraBtn}>
                            <Text style={{ color: 'white', fontSize: 12 }}>📷</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user?.role || 'Staff'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user?.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(user?.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(user?.status) }]}>
                            {user?.status?.toUpperCase() || 'ACTIVE'}
                        </Text>
                    </View>
                </View>

                {/* Form Section */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>👤</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Your full name"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>📧</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholder="Your email address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>📱</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                placeholder="Your phone number"
                            />
                        </View>
                    </View>

                    <View style={styles.divider} />
                    <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 15 }]}>🏦 Bank Settlement Details</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bank Name</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>🏛️</Text>
                            <TextInput
                                style={styles.input}
                                value={bankName}
                                onChangeText={setBankName}
                                placeholder="e.g. BOC, Commercial Bank"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Account Name</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>📝</Text>
                            <TextInput
                                style={styles.input}
                                value={accountName}
                                onChangeText={setAccountName}
                                placeholder="Name as per bank records"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Account Number</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>🔢</Text>
                            <TextInput
                                style={styles.input}
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                                keyboardType="numeric"
                                placeholder="8-15 digits"
                            />
                        </View>
                    </View>

                    {user?.id === 0 && (
                        <View style={styles.adminNote}>
                            <Text style={styles.adminNoteText}>
                                ℹ️ You are logged in as a hardcoded Admin. Real-time updates to this specific account are limited in the database.
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity 
                        style={[styles.saveBtn, isUpdating && styles.disabledBtn]} 
                        onPress={handleUpdateProfile}
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>💾 Save Changes</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <Text style={styles.logoutBtnText}>🚪 Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Profile Security</Text>
                <Text style={styles.infoDesc}>
                    Your account details are used for attendance tracking and order assignments. Keep them updated to ensure smooth operations.
                </Text>
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 20,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 25,
    },
    imageWrapper: {
        position: 'relative',
        marginBottom: 12,
    },
    profileImg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#F3F4F6',
    },
    initialsCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#F3F4F6',
    },
    initialsText: {
        color: 'white',
        fontSize: 40,
        fontWeight: 'bold',
    },
    cameraBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#111827',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    roleBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 6,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
        textTransform: 'uppercase',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    form: {
        marginTop: 10,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    inputIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: '#111827',
    },
    saveBtn: {
        backgroundColor: '#111827',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    saveBtnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 20,
    },
    logoutBtn: {
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EF4444',
        borderRadius: 12,
    },
    logoutBtnText: {
        color: '#EF4444',
        fontWeight: 'bold',
        fontSize: 14,
    },
    adminNote: {
        backgroundColor: '#FFFBEB',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    adminNoteText: {
        fontSize: 11,
        color: '#92400E',
        lineHeight: 16,
    },
    infoBox: {
        backgroundColor: '#EDE9FE',
        padding: 16,
        borderRadius: 16,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#5B21B6',
        marginBottom: 4,
    },
    infoDesc: {
        fontSize: 12,
        color: '#6D28D9',
        lineHeight: 18,
    },
});

export default AccountSection;
