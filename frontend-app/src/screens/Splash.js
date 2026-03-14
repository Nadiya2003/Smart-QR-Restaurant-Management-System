import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, TouchableOpacity, Image } from 'react-native';

const Splash = ({ onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 5,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto navigate after 3 seconds
        const timer = setTimeout(() => {
            onFinish();
        }, 3000);

        return () => clearTimeout(timer);
    }, [fadeAnim, slideAnim, onFinish]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#111827" />

            <Animated.View style={[
                styles.content,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}>
                <View style={styles.iconContainer}>
                    <Image 
                        source={require('../../assets/logo.png')} 
                        style={{ width: 80, height: 80, resizeMode: 'contain' }} 
                    />
                </View>

                <Text style={styles.title}>
                    Melissa’s
                    <Text style={styles.titleHighLight}> Food Court</Text>
                </Text>

                <Text style={styles.subtitle}>
                    Seamless Dining. Smart Management. Exceptional Taste.
                </Text>
            </Animated.View>

            <TouchableOpacity style={styles.button} onPress={onFinish}>
                <Text style={styles.buttonText}>Enter Restaurant</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827', // gray-900
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    iconText: {
        fontSize: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 10,
        textAlign: 'center',
    },
    titleHighLight: {
        color: '#FFD700', // Gold
    },
    subtitle: {
        fontSize: 16,
        color: '#E5E7EB', // gray-200
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#FFD700',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginTop: 20,
    },
    buttonText: {
        color: '#000000',
        fontSize: 18,
        fontWeight: 'bold',
    }
});

export default Splash;
