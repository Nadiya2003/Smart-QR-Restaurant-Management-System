import { useState } from "react";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";

function Settings() {
  const [formData, setFormData] = useState({
    name: "Kasun",
    email: "kasun@example.com",
    phone: "+94701234567",
  });

  // Handle input field changes
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle save (you can later connect this to backend)
  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Saved Data:", formData);
  };

  return (
    <div className="min-h-screen bg-dark-gradient md:ml-64 mb-20 md:mb-0 px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Account Settings</h1>
          <p className="text-gray-400">
            Manage your profile and preferences
          </p>
        </div>

        {/* Profile Information */}
        <GlassCard className="mb-6">
          <h2 className="text-2xl font-bold mb-6">Profile Information</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <Button type="submit" className="mt-4">
              Save Changes
            </Button>
          </form>
        </GlassCard>

        {/* Notification Settings */}
        <GlassCard>
          <h2 className="text-2xl font-bold mb-6">Notifications</h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 accent-gold-500"
            />
            <span className="text-sm text-gray-300">
              Email notifications for orders
            </span>
          </label>
        </GlassCard>

      </div>
    </div>
  );
}

export default Settings;
