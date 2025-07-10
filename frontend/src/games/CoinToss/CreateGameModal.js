import React, { useState, useEffect } from "react";

const CreateGameModal = ({ isOpen, onClose, onCreateGame }) => {
  const [wagerAmount, setWagerAmount] = useState("");
  const [coinChoice, setCoinChoice] = useState("Heads"); // default to Heads

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative z-50">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
          onClick={onClose}
        >
          ✖
        </button>
        <h2 className="text-xl font-bold text-center mb-4">
          Create a Coin Toss Game
        </h2>
        <input
          type="number"
          className="p-3 border rounded-md w-full text-black"
          placeholder="Enter wager amount"
          value={wagerAmount}
          onChange={(e) => setWagerAmount(e.target.value)}
        />
        {/* New coin side selection */}
        <div className="mt-4 text-black">
  <p className="font-bold">Choose Your Side:</p>
  <div className="flex space-x-4 mt-2">
    <label className="flex items-center space-x-1">
      <input
        type="radio"
        name="coinChoice"
        value="Heads"
        checked={coinChoice === "Heads"}
        onChange={(e) => setCoinChoice(e.target.value)}
      />
      <span>Heads</span>
    </label>
    <label className="flex items-center space-x-1">
      <input
        type="radio"
        name="coinChoice"
        value="Tails"
        checked={coinChoice === "Tails"}
        onChange={(e) => setCoinChoice(e.target.value)}
      />
      <span>Tails</span>
    </label>
  </div>
</div>

        <button
          className="w-full mt-4 px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          onClick={() => {
            onCreateGame(parseFloat(wagerAmount), coinChoice);
            setWagerAmount("");
            onClose();
          }}
          disabled={!wagerAmount || wagerAmount <= 0}
        >
          Create Game
        </button>
      </div>
    </div>
  );
};

export default CreateGameModal;
