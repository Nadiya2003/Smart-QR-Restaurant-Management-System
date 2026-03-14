/**
 * SMS Gateway Utility
 * Mockup for automated SMS confirmation
 */
export const sendSMS = async (to, message) => {
    try {
        // In a real scenario, you would use an API like Twilio, TextLocal, or a local provider
        // Example with Twilio:
        /*
        const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });
        */

        console.log('--- SMS GATEWAY ---');
        console.log(`To: ${to}`);
        console.log(`Message: ${message}`);
        console.log('-------------------');
        
        return { success: true, message: 'SMS sent successfully' };
    } catch (error) {
        console.error('SMS Gateway Error:', error);
        return { success: false, error: error.message };
    }
};

export const formatReservationSMS = (details) => {
    return `Hello ${details.customer_name},
Your reservation at Melissa Restaurant is confirmed.

Area: ${details.area_name}
Table: Table ${details.table_number}
Date: ${details.date}
Time: ${details.time}
Guests: ${details.guests}

We look forward to serving you.
Melissa Restaurant`;
};
