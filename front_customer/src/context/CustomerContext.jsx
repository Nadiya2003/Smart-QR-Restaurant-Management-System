import { createContext, useContext, useState, useEffect } from 'react';

const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
    const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
    const [selectedSteward, setSelectedSteward] = useState(null);
    const [customerData, setCustomerData] = useState(null);

    const refreshAuth = () => {
        const auth = localStorage.getItem('customerAuth');
        if (auth) {
            const parsed = JSON.parse(auth);
            setIsCustomerLoggedIn(true);
            setCustomerData(parsed);
        } else {
            setIsCustomerLoggedIn(false);
            setCustomerData(null);
        }

        const steward = localStorage.getItem('selectedSteward');
        if (steward) {
            setSelectedSteward(JSON.parse(steward));
        } else {
            setSelectedSteward(null);
        }
    };

    useEffect(() => {
        refreshAuth();
    }, []);

    return (
        <CustomerContext.Provider value={{
            isCustomerLoggedIn,
            selectedSteward,
            customerData,
            refreshAuth,
            setIsCustomerLoggedIn,
            setSelectedSteward
        }}>
            {children}
        </CustomerContext.Provider>
    );
};

export const useCustomer = () => useContext(CustomerContext);
