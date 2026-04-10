// src/pages/RegistrationCheckoutPage.jsx
import React, { useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function RegistrationCheckoutPage() {
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const location = useLocation();
  const { addItem } = useCart();

  useEffect(() => {
    const course = location.state?.course;
    const participant = location.state?.participant;

    if (!course || !participant) {
      navigate(`/c/${clubSlug}`);
      return;
    }

    // 🔥 BÚUM TIL REGISTRATION ITEM FYRIR CART
    const cartItem = {
      cartId: `reg-${Date.now()}`,
      id: course.id,
      name: course.title,
      price: course.price || 0,
      type: "REGISTRATION",

      // 🔥 CRITICAL fyrir multi-tenant + processing
      leisureGrantEligible: course.leisureGrantEligible || false,
      durationWeeks: course.durationWeeks || null,

      registration: {
        requiresAthleteName: true,
        requiresAthleteDob: true,
        requiresGuardian: true,
        requiresNotes: false,
      },

      // 👇 prefill data (optional)
      prefill: {
        athleteName: participant.name || "",
        athleteDob: participant.birthDate || "",
        guardianName: "",
        notes: "",
        kennitala: participant.kennitala || "",
      },
    };

    addItem(cartItem);

    // 👉 redirect í NÝJA checkout flowið
    navigate(`/c/${clubSlug}/checkout`);
  }, [clubSlug, location.state, addItem, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Færi þig í greiðslu...
    </div>
  );
}
