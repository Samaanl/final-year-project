import React from "react";

export default function App() {
  return (
    <div className=" h-screen flex flex-col gap">
      <div className="bg-white h-12 ">top bar</div>
      <div className=" h-full flex  gap-0.5">
        <div className="bg-gray-200 flex-1 ">main canvas</div>
        <div className="bg-gray-300 w-52 ">side bar</div>
      </div>
    </div>
  );
}
