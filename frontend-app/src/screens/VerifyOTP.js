import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const VerifyOTP = ({ email, onVerified, onBack }) => {
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { verifyOTP } = useAuth();

    const handleVerify = async () => {
        if (!otp.trim()) {
            setError('Please enter the OTP');
            return;
        }

        if (otp.length !== 6) {
            setError('OTP must be 6 digits');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const res = await verifyOTP(email, otp.trim());
            if (res.success) {
                onVerified(otp.trim());
            } else {
                setError(res.message);
                Alert.alert("Invalid OTP", res.message);
            }
        } catch (err) {
            setError('An error occurred during verification');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* Back Button */}
            <TouchableOpacity
                onPress={onBack}
                style={styles.backButton}
                disabled={isLoading}
            >
                <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Text style={{ fontSize: 32 }}>🛡️</Text>
                    </View>
                    <Text style={styles.headerTitle}>Verify OTP</Text>
                    <Text style={styles.headerSubtitle}>Enter the 6-digit code sent to {email}</Text>
                </View>

                <View style={styles.form}>
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>⚠️ {error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>One-Time Password</Text>
                        <TextInput
                            style={styles.otpInput}
                            placeholder="000000"
                            placeholderTextColor="#9CA3AF"
                            value={otp}
                            onChangeText={setOtp}
                            keyboardType="number-pad"
                            maxLength={6}
                            letterSpacing={10}
                            textAlign="center"
                            editable={!isLoading}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleVerify}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.buttonText}>Verify Code</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ marginTop: 20, alignItems: 'center' }}
                        onPress={onBack}
                        disabled={isLoading}
                    >
                        <Text style={{ color: '#6B7280', fontSize: 14 }}>
                            Didn't receive code? <Text style={{ color: '#000', fontWeight: 'bold' }}>Try another email</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        padding: 20,
    },
    backButton: {
        position: 'absolute',
        top: 50,
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
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
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
        textAlign: 'center',
    },
    form: {
        padding: 30,
    },
    errorContainer: {
        backgroundColor: '#FEF2F2',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#000',
    },
    errorText: {
        color: '#000',
        fontSize: 14,
    },
    inputGroup: {
        marginBottom: 30,
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 15,
    },
    otpInput: {
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        width: '80%',
        fontSize: 32,
        fontWeight: 'bold',
        paddingVertical: 10,
        color: '#111827',
    },
    button: {
        backgroundColor: '#000000',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default VerifyOTP;
