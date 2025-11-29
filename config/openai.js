const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Process Excel/CSV data with OpenAI to extract participant information
const processParticipantData = async (data) => {
  try {
    const prompt = `
You are an AI assistant helping to process youth participant data for a nonprofit organization called HeartSmiles. 

Please analyze the following data and extract participant information. Return a JSON array of participant objects with the following structure:
{
  "participants": [
    {
      "name": "Full name of participant",
      "dateOfBirth": "YYYY-MM-DD format",
      "address": "Full address",
      "referralDate": "YYYY-MM-DD format",
      "school": "School name",
      "identificationNumber": "Unique ID number",
      "programs": ["program1", "program2"], // Array of program names they're enrolled in
      "notes": ["note1", "note2"] // Array of any additional notes or observations
    }
  ]
}

Rules:
1. If a date is ambiguous, use the most recent reasonable date
2. If multiple programs are mentioned, include all of them
3. If no clear identification number exists, create a temporary one based on name and school
4. If information is missing, use empty string ""
5. Ensure all dates are in YYYY-MM-DD format
6. Clean up any inconsistent formatting
7. If you see multiple rows for the same person, combine them into one participant object

Data to process:
${JSON.stringify(data, null, 2)}

Please return ONLY the JSON response, no additional text or formatting.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a data processing assistant specializing in extracting structured participant information from various data formats. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Parse the JSON response
    const parsedResponse = JSON.parse(responseText);
    
    return {
      success: true,
      data: parsedResponse.participants || []
    };

  } catch (error) {
    console.error('OpenAI processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Process program data with OpenAI
const processProgramData = async (data) => {
  try {
    const prompt = `
You are an AI assistant helping to process program data for a nonprofit organization called HeartSmiles.

Please analyze the following data and extract program information. Return a JSON array of program objects with the following structure:
{
  "programs": [
    {
      "name": "Program name",
      "description": "Detailed description of the program",
      "participants": ["participant1", "participant2"] // Array of participant names enrolled
    }
  ]
}

Rules:
1. If multiple similar programs exist, combine them if they're the same program
2. Create meaningful descriptions if none exist
3. Extract participant names if mentioned
4. If information is missing, use empty string ""
5. Clean up any inconsistent formatting

Data to process:
${JSON.stringify(data, null, 2)}

Please return ONLY the JSON response, no additional text or formatting.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a data processing assistant specializing in extracting structured program information from various data formats. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Parse the JSON response
    const parsedResponse = JSON.parse(responseText);
    
    return {
      success: true,
      data: parsedResponse.programs || []
    };

  } catch (error) {
    console.error('OpenAI program processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Validate and clean participant data
const validateParticipantData = (participant) => {
  const errors = [];
  
  if (!participant.name || participant.name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }
  
  if (participant.dateOfBirth && !isValidDate(participant.dateOfBirth)) {
    errors.push('Date of birth must be a valid date in YYYY-MM-DD format');
  }
  
  if (participant.referralDate && !isValidDate(participant.referralDate)) {
    errors.push('Referral date must be a valid date in YYYY-MM-DD format');
  }
  
  if (!participant.identificationNumber || participant.identificationNumber.trim().length < 3) {
    errors.push('Identification number is required and must be at least 3 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate and clean program data
const validateProgramData = (program) => {
  const errors = [];
  
  if (!program.name || program.name.trim().length < 2) {
    errors.push('Program name is required and must be at least 2 characters');
  }
  
  if (!program.description || program.description.trim().length < 10) {
    errors.push('Program description is required and must be at least 10 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to validate date format
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};

module.exports = {
  openai,
  processParticipantData,
  processProgramData,
  validateParticipantData,
  validateProgramData
};
