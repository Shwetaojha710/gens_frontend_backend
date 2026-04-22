const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const Candidate = sequelize.define(
  "candidate",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    current_company: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue("skills");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        const normalizedValue = Array.isArray(value)
          ? value.filter(Boolean)
          : String(value || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
        this.setDataValue("skills", JSON.stringify(normalizedValue));
      },
    },
    resume_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    experience: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    current_ctc: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expected_ctc: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notice_period: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cover_letter: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    last_company: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    current_location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    relocate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    home_town: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    roles_and_responsibilities: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    project: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tools: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    offer_in_hand: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    family_background: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    highest_qualification: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "candidates",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
    ],
  },
);


// Candidate.sync({alter:true}).then(() => {
//     console.log("Candidate model synced successfully");
// }).catch((error) => {
//     console.error("Error syncing Candidate model:", error);
// });

module.exports = Candidate;
