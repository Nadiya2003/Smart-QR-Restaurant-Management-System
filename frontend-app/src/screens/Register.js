import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Modal,
    FlatList,
    Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import apiConfig from '../config/api';

const Register = ({ onRegisterSuccess, onSwitchToLogin }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState(null);
    const [roles, setRoles] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [profileImage, setProfileImage] = useState(null);


    // Fetch available roles from backend
    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoadingRoles(true);
            const res = await fetch(apiConfig.STAFF.ROLES);
            if (res.ok) {
                const data = await res.json();
                if (data.roles && data.roles.length > 0) {
                    setRoles(data.roles);
                } else {
                    throw new Error('No roles returned');
                }
            } else {
                throw new Error('API failed');
            }
        } catch (error) {
            console.warn('Using fallback roles:', error.message);
            const fallbackRoles = [
                { id: 1, role_name: 'admin', description: 'System Administrator' },
                { id: 2, role_name: 'manager', description: 'Restaurant Manager' },
                { id: 3, role_name: 'cashier', description: 'Cashier' },
                { id: 4, role_name: 'steward', description: 'Steward/Waiter' },
                { id: 5, role_name: 'kitchen_staff', description: 'Kitchen Staff' },
                { id: 6, role_name: 'bar_staff', description: 'Bar Staff' },
                { id: 7, role_name: 'delivery_rider', description: 'Delivery Rider' },
                { id: 8, role_name: 'inventory_manager', description: 'Inventory Manager' },
                { id: 9, role_name: 'supplier', description: 'Supplier/Vendor' },
            ];
            setRoles(fallbackRoles);
        } finally {
            setLoadingRoles(false);
        }
    };

    const getRoleIcon = (roleName) => {
        const icons = {
            'admin': '🛡️',
            'manager': '👔',
            'cashier': '💰',
            'steward': '🪑',
            'kitchen_staff': '👨‍🍳',
            'bar_staff': '🍹',
            'delivery_rider': '🛵',
            'inventory_manager': '📦',
            'supplier': '🚚',
        };
        return icons[roleName] || '👤';
    };

    const formatRoleName = (name) => {
        return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const pickImage = async () => {
        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera roll permissions to upload a profile picture.');
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

    const handleRegister = async () => {
        // Validation
        if (!fullName.trim()) {
            setError('Please enter your full name');
            return;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }
        if (phone.trim() && !/^(?:\+94|0)7[0-9]{8}$/.test(phone.trim())) {
            setError('Please enter a valid Sri Lankan phone number (e.g., 07XXXXXXXX)');
            return;
        }
        if (!password.trim()) {
            setError('Please enter a password');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!selectedRole) {
            setError('Please select a role');
            return;
        }
        if (!agreedToTerms) {
            setError('You must agree to the Terms & Conditions');
            return;
        }


        setError('');
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('full_name', fullName.trim());
            formData.append('email', email.trim());
            formData.append('phone', phone.trim() || '');
            formData.append('password', password);
            formData.append('role', selectedRole.role_name);

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

            const res = await fetch(apiConfig.STAFF.REGISTER, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                Alert.alert(
                    'Registration Successful! ✅',
                    'Your account has been created. Please wait for the admin to activate your account before logging in.',
                    [{ text: 'Go to Login', onPress: () => onSwitchToLogin && onSwitchToLogin() }]
                );
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setError('Network error. Make sure the backend server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : null}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                {/* Back Button */}
                <TouchableOpacity
                    onPress={onSwitchToLogin}
                    style={styles.backButton}
                    disabled={isLoading}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Text style={{ fontSize: 32 }}>👨‍🍳</Text>
                        </View>
                        <Text style={styles.headerTitle}>Melissa's Food Court</Text>
                        <Text style={styles.headerSubtitle}>Staff Registration Portal</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>⚠️ {error}</Text>
                            </View>
                        ) : (
                            <View style={{ height: 0 }} />
                        )}

                        {/* Profile Image Upload */}
                        <View style={styles.profileImageSection}>
                            <TouchableOpacity onPress={pickImage} style={styles.imagePickerWrapper}>
                                {profileImage ? (
                                    <Image source={{ uri: profileImage.uri }} style={styles.previewImage} />
                                ) : (
                                    <View style={styles.placeholderImage}>
                                        <Text style={{ fontSize: 40 }}>👤</Text>
                                        <Text style={styles.addPhotoText}>Add Photo</Text>
                                    </View>
                                )}
                                <View style={styles.editIconBadge}>
                                    <Text style={{ color: 'white', fontSize: 12 }}>📷</Text>
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.imageNote}>Upload a professional profile picture</Text>
                        </View>

                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>👤</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#9CA3AF"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>📧</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        {/* Phone */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>📱</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter phone number (optional)"
                                    placeholderTextColor="#9CA3AF"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        {/* Role Selector */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Role *</Text>
                            <TouchableOpacity
                                style={styles.inputContainer}
                                onPress={() => setShowRolePicker(true)}
                                disabled={isLoading || loadingRoles}
                            >
                                <Text style={styles.inputIcon}>🏷️</Text>
                                {loadingRoles ? (
                                    <ActivityIndicator size="small" color="#6B7280" style={{ flex: 1 }} />
                                ) : (
                                    <Text style={[styles.input, { paddingVertical: 14, color: selectedRole ? '#111827' : '#9CA3AF' }]}>
                                        {selectedRole
                                            ? `${getRoleIcon(selectedRole.role_name)} ${formatRoleName(selectedRole.role_name)}`
                                            : 'Select your role'
                                        }
                                    </Text>
                                )}
                                <Text style={{ fontSize: 16, color: '#9CA3AF' }}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Create a password (min 6 chars)"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    editable={!isLoading}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Text style={{ fontSize: 20 }}>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🔐</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm your password"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    editable={!isLoading}
                                />
                            </View>
                        </View>
                        
                        {/* Terms & Conditions Checkbox */}
                        <TouchableOpacity 
                            style={styles.checkboxContainer} 
                            onPress={() => setAgreedToTerms(!agreedToTerms)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                                {agreedToTerms && <Text style={styles.checkboxCheckmark}>✓</Text>}
                            </View>
                            <Text style={styles.checkboxLabel}>
                                I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text> and Privacy Policy
                            </Text>
                        </TouchableOpacity>


                        {/* Register Button */}
                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        {/* Switch to Login */}
                        <TouchableOpacity
                            style={styles.switchButton}
                            onPress={onSwitchToLogin}
                            disabled={isLoading}
                        >
                            <Text style={styles.switchText}>
                                Already have an account? <Text style={styles.switchLink}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Info Note */}
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                ℹ️ After registration, your account will need to be activated by an admin before you can log in.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Role Picker Modal */}
            <Modal
                visible={showRolePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRolePicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowRolePicker(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Your Role</Text>
                            <TouchableOpacity onPress={() => setShowRolePicker(false)}>
                                <Text style={{ fontSize: 22 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={roles}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.roleItem,
                                        selectedRole?.id === item.id && styles.roleItemSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedRole(item);
                                        setShowRolePicker(false);
                                    }}
                                >
                                    <Text style={styles.roleIcon}>{getRoleIcon(item.role_name)}</Text>
                                    <View style={styles.roleInfo}>
                                        <Text style={styles.roleName}>{formatRoleName(item.role_name)}</Text>
                                        {item.description ? (
                                            <Text style={styles.roleDesc}>{item.description}</Text>
                                        ) : null}
                                    </View>
                                    {selectedRole?.id === item.id && (
                                        <Text style={{ fontSize: 18 }}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        padding: 20,
        paddingTop: 80,
        paddingBottom: 60,
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.08)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    backButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#111827',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        backgroundColor: '#000000',
        padding: 30,
        alignItems: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#ffffff',
    },
    form: {
        padding: 20,
    },
    errorContainer: {
        backgroundColor: '#FEF2F2',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
    },
    errorText: {
        color: '#991B1B',
        fontSize: 14,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
        fontSize: 20,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    eyeIcon: {
        padding: 5,
    },
    button: {
        backgroundColor: '#000000',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#383838',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    switchText: {
        fontSize: 14,
        color: '#6B7280',
    },
    switchLink: {
        color: '#000000',
        fontWeight: 'bold',
    },
    infoBox: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    infoText: {
        fontSize: 12,
        color: '#1E40AF',
        lineHeight: 18,
    },
    // Checkbox Styles
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderWidth: 2,
        borderColor: '#000000',
        borderRadius: 6,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkboxChecked: {
        backgroundColor: '#000000',
    },
    checkboxCheckmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
    },
    termsLink: {
        color: '#000',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    // Modal styles

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '60%',
        paddingBottom: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    roleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    roleItemSelected: {
        backgroundColor: '#F0FDF4',
    },
    roleIcon: {
        fontSize: 28,
        marginRight: 14,
    },
    roleInfo: {
        flex: 1,
    },
    roleName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    roleDesc: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    // Image Picker Styles
    profileImageSection: {
        alignItems: 'center',
        marginBottom: 25,
    },
    imagePickerWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        position: 'relative',
    },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    placeholderImage: {
        alignItems: 'center',
    },
    addPhotoText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: 'bold',
        marginTop: 4,
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#000',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    imageNote: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 10,
    },
});

export default Register;
