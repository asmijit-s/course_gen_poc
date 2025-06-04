import React, { useState } from "react";
import "./style.css";

function CourseGenerator() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    modules: "",
    audience: ""
  });

  const [output, setOutput] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:3003/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseTitle: formData.title,
        courseOverview: formData.description,
        targetAudience: formData.audience,
        numModules: formData.modules,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setOutput(JSON.stringify(data.data, null, 2)); // Show the plan cleanly
    } else {
      setOutput("Error from server: " + data.error);
    }
  } catch (error) {
    setOutput("Error: " + error.message);
  }
};


  return (
    <div className="container">
      <h2>Course Generator Wizard</h2>
      <form onSubmit={handleSubmit}>
        <label>What is Title of the course</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <label>Description of course</label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <label>Expected number of modules</label>
        <input
          type="number"
          name="modules"
          value={formData.modules}
          onChange={handleChange}
          required
        />

        <label>Who is the target audience</label>
        <input
          type="text"
          name="audience"
          value={formData.audience}
          onChange={handleChange}
          required
        />

        <button className="submit-button" type="submit">Submit</button>
      </form>

      <div className="output-box">
        <p>{output ? output : "Output from backend api"}</p>
      </div>
    </div>
  );
}

export default CourseGenerator;
