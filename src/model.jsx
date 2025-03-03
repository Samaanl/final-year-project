import React, { useState } from "react";

const Model = () => {
  const [inputValue, setInputValue] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleNewPageClick = () => {
    setShowModal(true);
  };

  const handleSubmit = () => {
    console.log("User input:", inputValue);
    setShowModal(false);
  };

  return (
    <div>
      <button onClick={handleNewPageClick}>Open Input</button>

      {showModal && (
        <div className="modal">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button onClick={handleSubmit}>OK</button>
          <button onClick={() => setShowModal(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default Model;