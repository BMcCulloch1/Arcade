import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/auth/profile"; // Adjust endpoint if needed

const Profile = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          console.error("❌ No auth token found.");
          return;
        }

        const { data } = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success) {
          setUser(data.user);
        } else {
          console.error("❌ Failed to fetch user profile:", data.message);
        }
      } catch (error) {
        console.error("❌ Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  if (!user) {
    return <p className="text-white text-center">Loading profile...</p>;
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-6">👤 Profile</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div
          className="w-20 h-20 flex items-center justify-center rounded-full text-white font-bold text-2xl"
          style={{ backgroundColor: user.avatar_color }}
        >
          {user.avatar_initials}
        </div>

        {/* User Email */}
        <p className="mt-4 text-lg font-semibold">{user.email}</p>
      </div>
    </div>
  );
};

export default Profile;
