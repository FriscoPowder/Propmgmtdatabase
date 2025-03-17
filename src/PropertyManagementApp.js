import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  Label,
} from "./UIComponents";

const INITIAL_EXPENSE = { amount: "", description: "" };
const INITIAL_PROPERTY_STATE = {
  name: "",
  rent: "",
  expenses: [INITIAL_EXPENSE],
  managementFeePercentage: "",
  convenienceFee: "",
  paymentDate: new Date().toISOString().split("T")[0],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount
  );

const formatDate = (dateString) => {
  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
};

const parseNumber = (value) => parseFloat(value) || 0;

const calculations = {
  totalRevenue: ({ rent, convenienceFee }) =>
    parseNumber(rent) + parseNumber(convenienceFee),
  managementFee: ({ rent, managementFeePercentage }) =>
    (parseNumber(rent) * parseNumber(managementFeePercentage)) / 100,
  totalExpenses: (property) =>
    property.expenses.reduce(
      (total, exp) => total + parseNumber(exp.amount),
      0
    ) +
    calculations.managementFee(property) +
    parseNumber(property.convenienceFee),
  ownerPayout: (property) =>
    parseNumber(property.rent) +
    parseNumber(property.convenienceFee) -
    calculations.managementFee(property) -
    parseNumber(property.convenienceFee) -
    property.expenses.reduce(
      (total, exp) => total + parseNumber(exp.amount),
      0
    ),
};
const PropertyManagementApp = () => {
  const [properties, setProperties] = useState([]);
  const [editingProperty, setEditingProperty] = useState(null);
  const [newProperty, setNewProperty] = useState(INITIAL_PROPERTY_STATE);
  const [journalEntries, setJournalEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("calculator");

  const saveStateToURL = (properties, journalEntries) => {
    try {
      const compressedData = {
        p: properties.map((prop) => ({
          i: prop.id,
          n: prop.name,
          r: parseNumber(prop.rent),
          c: parseNumber(prop.convenienceFee),
          m: parseNumber(prop.managementFeePercentage),
          d: prop.paymentDate,
          e: prop.expenses
            .filter((exp) => parseNumber(exp.amount) > 0)
            .map((exp) => ({
              a: parseNumber(exp.amount),
              d: exp.description,
            })),
        })),
      };

      const jsonString = JSON.stringify(compressedData);
      const encodedData = encodeURIComponent(jsonString);

      window.location.hash = encodedData;

      console.log("State saved to URL");
    } catch (error) {
      console.error("Error saving state to URL:", error);
    }
  };

  const loadStateFromURL = () => {
    try {
      if (window.location.hash.length <= 1) {
        return null;
      }

      const encodedData = window.location.hash.substring(1);
      const jsonString = decodeURIComponent(encodedData);
      const compressedData = JSON.parse(jsonString);

      const loadedProperties = compressedData.p.map((prop) => ({
        id: prop.i,
        name: prop.n,
        rent: prop.r,
        convenienceFee: prop.c,
        managementFeePercentage: prop.m,
        paymentDate: prop.d,
        expenses: prop.e.map((exp) => ({
          amount: exp.a,
          description: exp.d,
        })),
      }));

      const loadedJournalEntries = [];
      loadedProperties.forEach((property) => {
        const entries = createJournalEntries(property);
        loadedJournalEntries.push(...entries);
      });

      return {
        properties: loadedProperties,
        journalEntries: loadedJournalEntries,
      };
    } catch (error) {
      console.error("Error loading state from URL:", error);
      return null;
    }
  };

  const generateShareableLink = useCallback(() => {
    saveStateToURL(properties, journalEntries);

    const fullUrl = window.location.href;

    navigator.clipboard
      .writeText(fullUrl)
      .then(() => {
        alert(
          "Shareable link copied to clipboard! You can save this link or share it with others to access your property database."
        );
      })
      .catch((err) => {
        console.error("Could not copy link: ", err);
        alert("Error copying link: " + err);
      });
  }, [properties, journalEntries]);

  const exportDatabase = useCallback(() => {
    try {
      const exportData = {
        properties: properties.map((prop) => ({
          id: prop.id,
          name: prop.name,
          paymentDate: prop.paymentDate,
          rent: parseNumber(prop.rent),
          convenienceFee: parseNumber(prop.convenienceFee),
          managementFeePercentage: parseNumber(prop.managementFeePercentage),
          expenses: prop.expenses.map((exp) => ({
            description: exp.description,
            amount: parseNumber(exp.amount),
          })),
        })),
        journalEntries: journalEntries,
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "property_management_database.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting database:", error);
      alert("Failed to export database. Please try again.");
    }
  }, [properties, journalEntries]);
  const createJournalEntries = useCallback((property) => {
    const entries = [
      {
        Date: formatDate(property.paymentDate),
        Account: "Rent Clearing Account",
        Description: `Total Collected for ${property.name}`,
        Debit: calculations.totalRevenue(property).toFixed(2),
        Credit: "0.00",
        Class: property.name,
      },
      {
        Date: formatDate(property.paymentDate),
        Account: "Rent Revenue Received",
        Description: `Rent for ${property.name}`,
        Debit: "0.00",
        Credit: property.rent.toFixed(2),
        Class: property.name,
      },
      {
        Date: formatDate(property.paymentDate),
        Account: "Rent Revenue-Convenience Fee",
        Description: `Convenience Fee for ${property.name}`,
        Debit: "0.00",
        Credit: property.convenienceFee.toFixed(2),
        Class: property.name,
      },
      {
        Date: formatDate(property.paymentDate),
        Account: "PM Income Conv Fees (Current)",
        Description: `Convenience Fee for ${property.name}`,
        Debit: "0.00",
        Credit: property.convenienceFee.toFixed(2),
        Class: property.name,
      },
      {
        Date: formatDate(property.paymentDate),
        Account: "Convenience Fee Expense",
        Description: `Convenience Fee for ${property.name}`,
        Debit: property.convenienceFee.toFixed(2),
        Credit: "0.00",
        Class: property.name,
      },
      {
        Date: formatDate(property.paymentDate),
        Account: "Property Management Fees",
        Description: `Management Fee for ${property.name}`,
        Debit: calculations.managementFee(property).toFixed(2),
        Credit: "0.00",
        Class: property.name,
      },
      {
        Date: formatDate(property.paymentDate),
        Account: "PM Income Fees Reg Income (Current)",
        Description: `Management Fee for ${property.name}`,
        Debit: "0.00",
        Credit: calculations.managementFee(property).toFixed(2),
        Class: property.name,
      },
    ];
    property.expenses.forEach((expense) => {
      if (parseNumber(expense.amount) > 0) {
        entries.push(
          {
            Date: formatDate(property.paymentDate),
            Account: "Repairs and Maintenanace",
            Description: `${expense.description} for ${property.name}`,
            Debit: expense.amount.toFixed(2),
            Credit: "0.00",
            Class: property.name,
          },
          {
            Date: formatDate(property.paymentDate),
            Account: "Repairs Payable",
            Description: `${expense.description} for ${property.name}`,
            Debit: "0.00",
            Credit: expense.amount.toFixed(2),
            Class: property.name,
          }
        );
      }
    });
    entries.push(
      {
        Date: formatDate(property.paymentDate),
        Account: "Property Owner Payout",
        Description: `Owner Payout for ${property.name}`,
        Debit: calculations.ownerPayout(property).toFixed(2),
        Credit: "0.00",
        Class: property.name,
      },
      {
        Date: formatDate(property.paymentDate),
        Account: "Owner Commissions Payable",
        Description: `Owner Payout for ${property.name}`,
        Debit: "0.00",
        Credit: calculations.ownerPayout(property).toFixed(2),
        Class: property.name,
      }
    );
    return entries;
  }, []);

  const importDatabase = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);

          if (
            !importedData.properties ||
            !Array.isArray(importedData.properties)
          ) {
            throw new Error("Invalid database format");
          }

          setProperties(importedData.properties);

          if (
            importedData.journalEntries &&
            Array.isArray(importedData.journalEntries)
          ) {
            setJournalEntries(importedData.journalEntries);
          } else {
            const newJournalEntries = [];
            importedData.properties.forEach((property) => {
              const entries = createJournalEntries(property);
              newJournalEntries.push(...entries);
            });
            setJournalEntries(newJournalEntries);
          }

          setTimeout(() => {
            saveStateToURL(
              importedData.properties,
              importedData.journalEntries || newJournalEntries
            );
          }, 0);

          alert("Database imported successfully!");
        } catch (error) {
          console.error("Error importing database:", error);
          alert("Failed to import database. Invalid file format.");
        }
      };
      reader.readAsText(file);
    },
    [createJournalEntries]
  );

  useEffect(() => {
    const savedState = loadStateFromURL();
    if (savedState) {
      setProperties(savedState.properties);
      setJournalEntries(savedState.journalEntries);
    }
  }, []);

  // New function to generate printable report in a new tab
  const generatePrintableReport = useCallback((property) => {
    // Create HTML content for the report
    const reportContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${property.name} - Property Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
          }
          h2 {
            color: #3498db;
            margin-top: 25px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
          }
          .total {
            font-weight: bold;
            margin-top: 10px;
          }
          .footer {
            margin-top: 30px;
            font-size: 0.9em;
            text-align: center;
            color: #7f8c8d;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table tr td:first-child {
            width: 70%;
          }
          table tr td:last-child {
            width: 30%;
            text-align: right;
          }
          table tr.section-total {
            font-weight: bold;
            border-top: 1px solid #ddd;
          }
          @media print {
            .no-print {
              display: none;
            }
            body {
              padding: 0;
              margin: 15mm;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; cursor: pointer; font-size: 16px;">Print Report</button>
          <button onclick="window.close()" style="padding: 8px 16px; background-color: #f44336; color: white; border: none; cursor: pointer; font-size: 16px; margin-left: 10px;">Close</button>
        </div>
        
        <h1>${property.name} - Property Report</h1>
        <p><strong>Payment Date:</strong> ${formatDate(
          property.paymentDate
        )}</p>
        
        <h2>Revenue</h2>
        <table>
          <tr>
            <td>Rent</td>
            <td>${formatCurrency(parseNumber(property.rent))}</td>
          </tr>
          <tr>
            <td>Convenience Fee</td>
            <td>${formatCurrency(parseNumber(property.convenienceFee))}</td>
          </tr>
          <tr class="section-total">
            <td>Total Revenue</td>
            <td>${formatCurrency(calculations.totalRevenue(property))}</td>
          </tr>
        </table>
        
        <h2>Expenses</h2>
        <table>
          <tr>
            <td>Management Fee (${property.managementFeePercentage}%)</td>
            <td>${formatCurrency(calculations.managementFee(property))}</td>
          </tr>
          <tr>
            <td>Convenience Fee</td>
            <td>${formatCurrency(parseNumber(property.convenienceFee))}</td>
          </tr>
          ${property.expenses
            .filter((exp) => parseNumber(exp.amount) > 0)
            .map(
              (exp) => `
                <tr>
                  <td>${exp.description}</td>
                  <td>${formatCurrency(parseNumber(exp.amount))}</td>
                </tr>
              `
            )
            .join("")}
          <tr class="section-total">
            <td>Total Expenses</td>
            <td>${formatCurrency(calculations.totalExpenses(property))}</td>
          </tr>
        </table>
        
        <h2>Net Income</h2>
        <table>
          <tr class="section-total">
            <td>Owner Payout</td>
            <td>${formatCurrency(calculations.ownerPayout(property))}</td>
          </tr>
        </table>
        
        <div class="footer">
          Report generated on ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `;

    // Open a new window and write the report content to it
    const reportWindow = window.open("", "_blank");
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
  }, []);

  const handleInputChange = useCallback((e, expenseIndex = null) => {
    const { id, value } = e.target;
    setNewProperty((prev) => {
      if (id === "paymentDate") {
        return { ...prev, [id]: value };
      }
      if (expenseIndex !== null) {
        const newExpenses = [...prev.expenses];
        newExpenses[expenseIndex] = {
          ...newExpenses[expenseIndex],
          [id]: value,
        };
        return { ...prev, expenses: newExpenses };
      }
      return { ...prev, [id]: value };
    });
  }, []);

  const addExpense = useCallback(
    () =>
      setNewProperty((prev) => ({
        ...prev,
        expenses: [...prev.expenses, INITIAL_EXPENSE],
      })),
    []
  );

  const removeExpense = useCallback(
    (index) =>
      setNewProperty((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((_, i) => i !== index),
      })),
    []
  );

  const handleSubmit = useCallback(() => {
    const propertyToSave = {
      ...newProperty,
      rent: parseNumber(newProperty.rent),
      expenses: newProperty.expenses
        .map((exp) => ({
          ...exp,
          amount: parseNumber(exp.amount),
        }))
        .filter((exp) => exp.amount > 0),
      managementFeePercentage: parseNumber(newProperty.managementFeePercentage),
      convenienceFee: parseNumber(newProperty.convenienceFee),
      id: editingProperty?.id || Date.now(),
    };

    const newJournalEntries = createJournalEntries(propertyToSave);

    let updatedProperties;
    setProperties((prev) => {
      updatedProperties = editingProperty
        ? prev.map((prop) =>
            prop.id === editingProperty.id ? propertyToSave : prop
          )
        : [...prev, propertyToSave];
      return updatedProperties;
    });

    let updatedJournalEntries;
    setJournalEntries((prev) => {
      const filteredEntries = editingProperty
        ? prev.filter((entry) => entry.Class !== editingProperty.name)
        : prev;
      updatedJournalEntries = [...filteredEntries, ...newJournalEntries];
      return updatedJournalEntries;
    });

    setTimeout(() => {
      saveStateToURL(updatedProperties, updatedJournalEntries);
    }, 0);

    setEditingProperty(null);
    setNewProperty(INITIAL_PROPERTY_STATE);
  }, [newProperty, editingProperty, createJournalEntries]);

  const handleEdit = useCallback((property) => {
    setEditingProperty(property);
    setNewProperty({
      ...property,
      expenses:
        property.expenses.length > 0 ? property.expenses : [INITIAL_EXPENSE],
    });
  }, []);

  const handleDelete = useCallback(
    (propertyId) => {
      const deletedProperty = properties.find((prop) => prop.id === propertyId);
      if (deletedProperty) {
        let updatedProperties;
        setProperties((prev) => {
          updatedProperties = prev.filter((prop) => prop.id !== propertyId);
          return updatedProperties;
        });

        let updatedJournalEntries;
        setJournalEntries((prev) => {
          updatedJournalEntries = prev.filter(
            (entry) => !entry.Description.includes(deletedProperty.name)
          );
          return updatedJournalEntries;
        });

        setTimeout(() => {
          saveStateToURL(updatedProperties, updatedJournalEntries);
        }, 0);
      }
    },
    [properties]
  );

  const generateCSV = useCallback(() => {
    const generateJournalNo = (date) => {
      const [month, day, year] = date.split("/");
      return `${year}${month}${day}Rent`;
    };
    const headers = [
      "Journal No.",
      "Journal Date",
      "Account",
      "Description",
      "Debits",
      "Credits",
      "Class",
    ];
    const csvEntries = journalEntries.filter(
      (entry) => parseFloat(entry.Debit) > 0 || parseFloat(entry.Credit) > 0
    );
    const csvContent = [
      headers,
      ...csvEntries.map((entry) => [
        generateJournalNo(entry.Date),
        entry.Date,
        entry.Account,
        entry.Description,
        parseFloat(entry.Debit) > 0 ? entry.Debit : "",
        parseFloat(entry.Credit) > 0 ? entry.Credit : "",
        entry.Class,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "property_management_journal_entry.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [journalEntries]);

  const handleFileUpload = useCallback((entries) => {
    setJournalEntries(entries);
    const newProperties = entries.reduce((acc, entry) => {
      const propertyName = entry.Class;
      if (propertyName !== entry.Class && !acc[propertyName]) {
        acc[propertyName] = {
          id: Date.now() + Math.random(),
          name: propertyName,
          paymentDate: entry.Date,
          rent: 0,
          convenienceFee: 0,
          managementFeePercentage: 0,
          expenses: [],
        };
      }
      if (propertyName !== entry.Class) {
        switch (entry.Account) {
          case "Rent Revenue Received":
            acc[propertyName].rent += parseNumber(entry.Credit);
            break;
          case "Rent Revenue-Convenience Fee":
            acc[propertyName].convenienceFee += parseNumber(entry.Credit);
            break;
          case "Property Management Fees":
            if (acc[propertyName].managementFeePercentage === 0) {
              acc[propertyName].managementFeePercentage =
                (parseNumber(entry.Debit) / acc[propertyName].rent) * 100;
            }
            break;
          case "Repairs and Maintenanace":
            acc[propertyName].expenses.push({
              description: entry.Description.split(" for ")[0],
              amount: parseNumber(entry.Debit),
            });
            break;
        }
      }
      return acc;
    }, {});
    setProperties(Object.values(newProperties));
  }, []);

  const FileUpload = useCallback(({ onFileUpload }) => {
    const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        const lines = text.split("\n");
        const headers = lines[0].split("\t");
        const entries = lines.slice(1).map((line) => {
          const values = line.split("\t");
          return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index];
            return obj;
          }, {});
        });
        onFileUpload(entries);
      }
    };
    return (
      <div className="space-y-4">
        <Input type="file" onChange={handleFileChange} accept=".txt,.csv" />
      </div>
    );
  }, []);

  const renderInputField = useCallback(
    (field) => (
      <div key={field} style={{ marginBottom: "1rem" }}>
        <Label htmlFor={field}>
          {field.charAt(0).toUpperCase() +
            field.slice(1).replace(/([A-Z])/g, " $1")}
        </Label>
        <Input
          id={field}
          type={field === "paymentDate" ? "date" : "text"}
          value={newProperty[field]}
          onChange={handleInputChange}
          placeholder={
            field === "paymentDate"
              ? "YYYY-MM-DD"
              : `Enter ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`
          }
        />
      </div>
    ),
    [newProperty, handleInputChange]
  );

  const renderExpenseFields = useCallback(
    () => (
      <div style={{ marginBottom: "1rem" }}>
        <Label>Expenses</Label>
        {newProperty.expenses.map((expense, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "flex-end",
              marginBottom: "0.5rem",
            }}
          >
            {["amount", "description"].map((field) => (
              <div key={field} style={{ flexGrow: 1, marginRight: "0.5rem" }}>
                <Label htmlFor={`${field}-${index}`}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Label>
                <Input
                  id={field}
                  type="text"
                  value={expense[field]}
                  onChange={(e) => handleInputChange(e, index)}
                  placeholder={`Enter expense ${field}`}
                />
              </div>
            ))}
            <Button
              onClick={() => removeExpense(index)}
              style={{ backgroundColor: "#e53e3e", marginBottom: "0.5rem" }}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button onClick={addExpense} style={{ backgroundColor: "#48bb78" }}>
          Add Expense
        </Button>
      </div>
    ),
    [newProperty.expenses, handleInputChange, removeExpense, addExpense]
  );
  const renderPropertyCard = useCallback(
    (property) => {
      return (
        <Card
          key={property.id}
          style={{
            marginBottom: "1rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
          }}
        >
          <CardHeader
            style={{ borderBottom: "1px solid #e2e8f0", padding: "1rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <CardTitle style={{ margin: 0 }}>{property.name}</CardTitle>
              <div>
                <Button
                  onClick={() => handleEdit(property)}
                  style={{ marginRight: "0.5rem", backgroundColor: "#4299e1" }}
                >
                  Edit
                </Button>
                <Button
                  onClick={() => generatePrintableReport(property)}
                  style={{ marginRight: "0.5rem", backgroundColor: "#48bb78" }}
                >
                  Export Report
                </Button>
                <Button
                  onClick={() => handleDelete(property.id)}
                  style={{ backgroundColor: "#e53e3e" }}
                >
                  Delete
                </Button>
              </div>
            </div>
            <p
              style={{
                margin: "0.5rem 0 0 0",
                color: "#718096",
                fontSize: "0.875rem",
              }}
            >
              Payment Date: {formatDate(property.paymentDate)}
            </p>
          </CardHeader>
          <CardContent style={{ padding: "1rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "0.5rem",
              }}
            >
              <h3
                style={{
                  gridColumn: "1 / -1",
                  margin: "0 0 0.5rem 0",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                Revenue
              </h3>
              <span>Rent</span>
              <span style={{ textAlign: "right" }}>
                {formatCurrency(parseNumber(property.rent))}
              </span>
              <span>Convenience Fee</span>
              <span style={{ textAlign: "right" }}>
                {formatCurrency(parseNumber(property.convenienceFee))}
              </span>
              <strong
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "0.25rem",
                }}
              >
                Total Revenue
              </strong>
              <strong
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "0.25rem",
                  textAlign: "right",
                }}
              >
                {formatCurrency(calculations.totalRevenue(property))}
              </strong>
              <h3
                style={{
                  gridColumn: "1 / -1",
                  margin: "1rem 0 0.5rem 0",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                Expenses
              </h3>
              <span>Management Fee</span>
              <span style={{ textAlign: "right" }}>
                {formatCurrency(calculations.managementFee(property))}
              </span>
              <span>Convenience Fee</span>
              <span style={{ textAlign: "right" }}>
                {formatCurrency(parseNumber(property.convenienceFee))}
              </span>
              {property.expenses
                .filter((expense) => parseNumber(expense.amount) > 0)
                .map((expense, index) => (
                  <React.Fragment key={index}>
                    <span>{expense.description}</span>
                    <span style={{ textAlign: "right" }}>
                      {formatCurrency(parseNumber(expense.amount))}
                    </span>
                  </React.Fragment>
                ))}
              <strong
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "0.25rem",
                }}
              >
                Total Expenses
              </strong>
              <strong
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "0.25rem",
                  textAlign: "right",
                }}
              >
                {formatCurrency(calculations.totalExpenses(property))}
              </strong>
              <h3
                style={{
                  gridColumn: "1 / -1",
                  margin: "1rem 0 0.5rem 0",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                Net Income (Owner Payout)
              </h3>
              <strong style={{ fontSize: "1.25rem" }}>Net Income</strong>
              <strong style={{ fontSize: "1.25rem", textAlign: "right" }}>
                {formatCurrency(calculations.ownerPayout(property))}
              </strong>
            </div>
            <p
              style={{
                margin: "1rem 0 0 0",
                color: "#718096",
                fontSize: "0.875rem",
              }}
            >
              Management Fee: {property.managementFeePercentage}%
            </p>
          </CardContent>
        </Card>
      );
    },
    [handleEdit, handleDelete, generatePrintableReport]
  );

  const TabNavigation = ({ activeTab, setActiveTab }) => {
    return (
      <div
        style={{
          display: "flex",
          marginBottom: "1rem",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <button
          onClick={() => setActiveTab("calculator")}
          style={{
            padding: "0.75rem 1rem",
            fontWeight: activeTab === "calculator" ? "bold" : "normal",
            borderBottom:
              activeTab === "calculator" ? "2px solid #4299e1" : "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginRight: "1rem",
          }}
        >
          Property Calculator
        </button>
        <button
          onClick={() => setActiveTab("database")}
          style={{
            padding: "0.75rem 1rem",
            fontWeight: activeTab === "database" ? "bold" : "normal",
            borderBottom:
              activeTab === "database" ? "2px solid #4299e1" : "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginRight: "1rem",
          }}
        >
          Saved Properties
        </button>
        <button
          onClick={() => setActiveTab("journalEntries")}
          style={{
            padding: "0.75rem 1rem",
            fontWeight: activeTab === "journalEntries" ? "bold" : "normal",
            borderBottom:
              activeTab === "journalEntries" ? "2px solid #4299e1" : "none",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Journal Entries
        </button>
      </div>
    );
  };
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem" }}>
      <h1
        style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Property Management Commission Calculator
      </h1>

      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "calculator" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {editingProperty ? "Edit Property" : "Add New Property"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                {[
                  "name",
                  "paymentDate",
                  "rent",
                  "convenienceFee",
                  "managementFeePercentage",
                ].map(renderInputField)}
                {renderExpenseFields()}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "1rem",
                  }}
                >
                  <Button onClick={handleSubmit}>
                    {editingProperty ? "Update Property" : "Add Property"}
                  </Button>
                  {editingProperty && (
                    <Button
                      style={{ backgroundColor: "#e53e3e" }}
                      onClick={() => {
                        setEditingProperty(null);
                        setNewProperty(INITIAL_PROPERTY_STATE);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{ marginTop: "2rem" }}>
            <CardHeader>
              <CardTitle>Upload AJE</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>

          <div style={{ marginTop: "2rem" }}>
            {properties.length > 0 &&
              renderPropertyCard(properties[properties.length - 1])}
          </div>

          {properties.length > 0 && (
            <Button onClick={generateCSV} style={{ marginTop: "1rem" }}>
              Generate CSV for Journal Entry
            </Button>
          )}
        </>
      )}

      {activeTab === "database" && (
        <DatabaseView
          properties={properties}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          renderPropertyCard={renderPropertyCard}
          exportDatabase={exportDatabase}
          importDatabase={importDatabase}
          generateShareableLink={generateShareableLink}
        />
      )}

      {activeTab === "journalEntries" && (
        <JournalEntryView
          journalEntries={journalEntries}
          properties={properties}
        />
      )}
    </div>
  );
};

const DatabaseView = ({
  properties,
  handleEdit,
  handleDelete,
  renderPropertyCard,
  exportDatabase,
  importDatabase,
  generateShareableLink,
}) => {
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const uniquePropertyNames = [...new Set(properties.map((prop) => prop.name))];

  useEffect(() => {
    if (selectedProperty) {
      const propertyEntries = properties.filter(
        (prop) => prop.name === selectedProperty
      );
      if (propertyEntries.length > 0) {
        const dates = propertyEntries.map((prop) => prop.paymentDate).sort();
        setStartDate(dates[0]);
        setEndDate(dates[dates.length - 1]);
      }
    }
  }, [selectedProperty, properties]);
  const filteredProperties = selectedProperty
    ? properties.filter((property) => property.name === selectedProperty)
    : properties;

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "rent":
        comparison = parseNumber(a.rent) - parseNumber(b.rent);
        break;
      case "date":
        comparison = new Date(a.paymentDate) - new Date(b.paymentDate);
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Saved Properties Database</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ marginBottom: "1rem" }}>
            <Label htmlFor="property-select">Select Property</Label>
            <select
              id="property-select"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.25rem",
                border: "1px solid #cbd5e0",
                marginBottom: "1rem",
              }}
            >
              <option value="">-- All Properties --</option>
              {uniquePropertyNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", marginBottom: "1rem" }}>
            <Label style={{ marginRight: "0.5rem" }}>Sort by:</Label>
            <Button
              onClick={() => handleSort("name")}
              style={{
                marginRight: "0.5rem",
                backgroundColor: sortBy === "name" ? "#4299e1" : "#cbd5e0",
              }}
            >
              Name {sortBy === "name" && (sortDirection === "asc" ? "↑" : "↓")}
            </Button>
            <Button
              onClick={() => handleSort("rent")}
              style={{
                marginRight: "0.5rem",
                backgroundColor: sortBy === "rent" ? "#4299e1" : "#cbd5e0",
              }}
            >
              Rent {sortBy === "rent" && (sortDirection === "asc" ? "↑" : "↓")}
            </Button>
            <Button
              onClick={() => handleSort("date")}
              style={{
                backgroundColor: sortBy === "date" ? "#4299e1" : "#cbd5e0",
              }}
            >
              Date {sortBy === "date" && (sortDirection === "asc" ? "↑" : "↓")}
            </Button>
          </div>

          <div>
            <p>Total Properties: {properties.length}</p>
            <p>Displayed Properties: {sortedProperties.length}</p>
          </div>

          <div style={{ display: "flex", marginTop: "1rem" }}>
            <Button
              onClick={exportDatabase}
              style={{ marginRight: "0.5rem", backgroundColor: "#38A169" }}
            >
              Export Database
            </Button>

            <div style={{ position: "relative" }}>
              <Button
                onClick={() =>
                  document.getElementById("import-database").click()
                }
                style={{ backgroundColor: "#DD6B20" }}
              >
                Import Database
              </Button>
              <input
                id="import-database"
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={importDatabase}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProperty && startDate && endDate && (
        <PropertyPL
          properties={properties}
          propertyName={selectedProperty}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      <DatabaseStats properties={filteredProperties} />

      <div style={{ marginTop: "1rem" }}>
        {sortedProperties.length > 0 ? (
          sortedProperties.map((property) => renderPropertyCard(property))
        ) : (
          <p>
            No properties found. Please add some properties or select a
            different property from the dropdown.
          </p>
        )}
      </div>

      {properties.length > 0 && (
        <Button
          onClick={generateShareableLink}
          style={{ marginTop: "1rem", backgroundColor: "#805AD5" }}
        >
          Copy Shareable Database Link
        </Button>
      )}
    </div>
  );
};

const PropertyPL = ({ properties, propertyName, startDate, endDate }) => {
  const [expandedSections, setExpandedSections] = useState({
    rent: false,
    convenienceFee: false,
    managementFee: false,
    expenses: false,
    netIncome: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const filteredProperties = properties.filter(
    (prop) =>
      prop.name === propertyName &&
      new Date(prop.paymentDate) >= new Date(startDate) &&
      new Date(prop.paymentDate) <= new Date(endDate)
  );

  const totals = {
    rent: filteredProperties.reduce(
      (sum, prop) => sum + parseNumber(prop.rent),
      0
    ),
    convenienceFee: filteredProperties.reduce(
      (sum, prop) => sum + parseNumber(prop.convenienceFee),
      0
    ),
    managementFee: filteredProperties.reduce(
      (sum, prop) => sum + calculations.managementFee(prop),
      0
    ),
    expenses: filteredProperties.reduce(
      (sum, prop) =>
        sum +
        prop.expenses.reduce(
          (expSum, exp) => expSum + parseNumber(exp.amount),
          0
        ),
      0
    ),
    totalRevenue: filteredProperties.reduce(
      (sum, prop) => sum + calculations.totalRevenue(prop),
      0
    ),
    totalExpenses: filteredProperties.reduce(
      (sum, prop) => sum + calculations.totalExpenses(prop),
      0
    ),
    netIncome: filteredProperties.reduce(
      (sum, prop) => sum + calculations.ownerPayout(prop),
      0
    ),
  };

  const expenseCategories = {};
  filteredProperties.forEach((prop) => {
    prop.expenses.forEach((exp) => {
      if (parseNumber(exp.amount) > 0) {
        const category = exp.description;
        if (!expenseCategories[category]) {
          expenseCategories[category] = {
            total: 0,
            entries: [],
          };
        }
        expenseCategories[category].total += parseNumber(exp.amount);
        expenseCategories[category].entries.push({
          date: prop.paymentDate,
          amount: parseNumber(exp.amount),
        });
      }
    });
  });

  const formatDateRange = () => {
    return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  };

  // Generate Printable P&L Report in new tab
  const generatePLReport = () => {
    // Create HTML content for the P&L report
    const reportContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${propertyName} - P&L Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
          }
          h2 {
            color: #3498db;
            margin-top: 25px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
          }
          .total {
            font-weight: bold;
            margin-top: 10px;
          }
          .footer {
            margin-top: 30px;
            font-size: 0.9em;
            text-align: center;
            color: #7f8c8d;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .expense-category {
            margin-left: 20px;
          }
          .text-right {
            text-align: right;
          }
          .section-total {
            font-weight: bold;
            background-color: #f2f9ff;
          }
          @media print {
            .no-print {
              display: none;
            }
            body {
              padding: 0;
              margin: 15mm;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; cursor: pointer; font-size: 16px;">Print Report</button>
          <button onclick="window.close()" style="padding: 8px 16px; background-color: #f44336; color: white; border: none; cursor: pointer; font-size: 16px; margin-left: 10px;">Close</button>
        </div>
        
        <h1>${propertyName} - Consolidated P&L Report</h1>
        <p><strong>Date Range:</strong> ${formatDate(
          startDate
        )} to ${formatDate(endDate)}</p>
        <p><strong>Payment Periods Included:</strong> ${
          filteredProperties.length
        }</p>
        
        <h2>Revenue</h2>
        <table>
          <tr>
            <th>Category</th>
            <th class="text-right">Amount</th>
          </tr>
          <tr>
            <td>Rent</td>
            <td class="text-right">${formatCurrency(totals.rent)}</td>
          </tr>
          <tr>
            <td>Convenience Fee</td>
            <td class="text-right">${formatCurrency(totals.convenienceFee)}</td>
          </tr>
          <tr class="section-total">
            <td>Total Revenue</td>
            <td class="text-right">${formatCurrency(totals.totalRevenue)}</td>
          </tr>
        </table>
        
        <h2>Expenses</h2>
        <table>
          <tr>
            <th>Category</th>
            <th class="text-right">Amount</th>
          </tr>
          <tr>
            <td>Management Fee</td>
            <td class="text-right">${formatCurrency(totals.managementFee)}</td>
          </tr>
          <tr>
            <td>Convenience Fee</td>
            <td class="text-right">${formatCurrency(totals.convenienceFee)}</td>
          </tr>
          ${Object.entries(expenseCategories)
            .map(
              ([category, data]) => `
            <tr>
              <td>${category}</td>
              <td class="text-right">${formatCurrency(data.total)}</td>
            </tr>
          `
            )
            .join("")}
          <tr class="section-total">
            <td>Total Expenses</td>
            <td class="text-right">${formatCurrency(totals.totalExpenses)}</td>
          </tr>
        </table>
        
        <h2>Net Income</h2>
        <table>
          <tr class="section-total">
            <td>Owner Payout</td>
            <td class="text-right">${formatCurrency(totals.netIncome)}</td>
          </tr>
        </table>
        
        <h2>Payment Periods Included</h2>
        <table>
          <tr>
            <th>Date</th>
            <th class="text-right">Rent</th>
            <th class="text-right">Expenses</th>
            <th class="text-right">Net Income</th>
          </tr>
          ${filteredProperties
            .map(
              (prop) => `
            <tr>
              <td>${formatDate(prop.paymentDate)}</td>
              <td class="text-right">${formatCurrency(
                parseNumber(prop.rent)
              )}</td>
              <td class="text-right">${formatCurrency(
                calculations.totalExpenses(prop)
              )}</td>
              <td class="text-right">${formatCurrency(
                calculations.ownerPayout(prop)
              )}</td>
            </tr>
          `
            )
            .join("")}
        </table>
        
        <div class="footer">
          Report generated on ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `;

    // Open a new window and write the report content
    const reportWindow = window.open("", "_blank");
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
  };

  const renderExpandableLine = (label, total, section, detailItems) => {
    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            cursor: "pointer",
            color: "#4299e1",
          }}
          onClick={() => toggleSection(section)}
        >
          <span>
            {label} {expandedSections[section] ? "▼" : "►"}
          </span>
          <span style={{ textAlign: "right" }}>{formatCurrency(total)}</span>
        </div>

        {expandedSections[section] && (
          <div
            style={{
              marginLeft: "1.5rem",
              borderLeft: "2px solid #e2e8f0",
              paddingLeft: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            {detailItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.25rem",
                }}
              >
                <span>{formatDate(item.date)}</span>
                <span style={{ textAlign: "right" }}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <Card style={{ marginTop: "1rem", marginBottom: "2rem" }}>
      <CardHeader>
        <CardTitle>P&L Summary for {propertyName}</CardTitle>
        <p style={{ color: "#718096" }}>Date Range: {formatDateRange()}</p>
        <p style={{ color: "#718096" }}>
          Includes data from {filteredProperties.length} payment periods
        </p>
      </CardHeader>
      <CardContent>
        <div
          style={{
            marginBottom: "0.5rem",
            fontSize: "0.875rem",
            color: "#718096",
          }}
        >
          Click on any blue item to see the breakdown by date
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "0.5rem",
          }}
        >
          <h3
            style={{
              gridColumn: "1 / -1",
              margin: "0 0 0.5rem 0",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
          >
            Revenue
          </h3>

          {renderExpandableLine(
            "Rent",
            totals.rent,
            "rent",
            filteredProperties.map((prop) => ({
              date: prop.paymentDate,
              amount: parseNumber(prop.rent),
            }))
          )}

          {renderExpandableLine(
            "Convenience Fee",
            totals.convenienceFee,
            "convenienceFee",
            filteredProperties.map((prop) => ({
              date: prop.paymentDate,
              amount: parseNumber(prop.convenienceFee),
            }))
          )}

          <strong
            style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.25rem" }}
          >
            Total Revenue
          </strong>
          <strong
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: "0.25rem",
              textAlign: "right",
            }}
          >
            {formatCurrency(totals.totalRevenue)}
          </strong>

          <h3
            style={{
              gridColumn: "1 / -1",
              margin: "1rem 0 0.5rem 0",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
          >
            Expenses
          </h3>

          {renderExpandableLine(
            "Management Fee",
            totals.managementFee,
            "managementFee",
            filteredProperties.map((prop) => ({
              date: prop.paymentDate,
              amount: calculations.managementFee(prop),
            }))
          )}

          {renderExpandableLine(
            "Convenience Fee",
            totals.convenienceFee,
            "convenienceFee",
            filteredProperties.map((prop) => ({
              date: prop.paymentDate,
              amount: parseNumber(prop.convenienceFee),
            }))
          )}

          {Object.entries(expenseCategories).map(([category, data], index) => (
            <React.Fragment key={index}>
              {renderExpandableLine(
                category,
                data.total,
                `expense_${index}`,
                data.entries
              )}
            </React.Fragment>
          ))}

          <strong
            style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.25rem" }}
          >
            Total Expenses
          </strong>
          <strong
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: "0.25rem",
              textAlign: "right",
            }}
          >
            {formatCurrency(totals.totalExpenses)}
          </strong>
          <h3
            style={{
              gridColumn: "1 / -1",
              margin: "1rem 0 0.5rem 0",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
          >
            Net Income (Owner Payout)
          </h3>

          {renderExpandableLine(
            "Net Income",
            totals.netIncome,
            "netIncome",
            filteredProperties.map((prop) => ({
              date: prop.paymentDate,
              amount: calculations.ownerPayout(prop),
            }))
          )}
        </div>

        <Button
          onClick={generatePLReport}
          style={{ marginTop: "1rem", backgroundColor: "#48bb78" }}
        >
          Export P&L Report
        </Button>
      </CardContent>
    </Card>
  );
};

const DatabaseStats = ({ properties }) => {
  const totalProperties = properties.length;
  const totalRent = properties.reduce(
    (sum, prop) => sum + parseNumber(prop.rent),
    0
  );
  const totalExpenses = properties.reduce((sum, prop) => {
    const propExpenses = prop.expenses.reduce(
      (expSum, exp) => expSum + parseNumber(exp.amount),
      0
    );
    const mgmtFee =
      (parseNumber(prop.rent) * parseNumber(prop.managementFeePercentage)) /
      100;
    return sum + propExpenses + mgmtFee + parseNumber(prop.convenienceFee);
  }, 0);
  const totalNetIncome = totalRent - totalExpenses;

  return (
    <Card style={{ marginTop: "1rem", marginBottom: "1rem" }}>
      <CardHeader>
        <CardTitle>Database Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "0.5rem",
              backgroundColor: "#EBF8FF",
              borderRadius: "0.25rem",
            }}
          >
            <p style={{ fontWeight: "bold", fontSize: "1.25rem" }}>
              {totalProperties}
            </p>
            <p>Properties</p>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "0.5rem",
              backgroundColor: "#E6FFFA",
              borderRadius: "0.25rem",
            }}
          >
            <p style={{ fontWeight: "bold", fontSize: "1.25rem" }}>
              {formatCurrency(totalRent)}
            </p>
            <p>Total Rent</p>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "0.5rem",
              backgroundColor: "#FFF5F5",
              borderRadius: "0.25rem",
            }}
          >
            <p style={{ fontWeight: "bold", fontSize: "1.25rem" }}>
              {formatCurrency(totalExpenses)}
            </p>
            <p>Total Expenses</p>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "0.5rem",
              backgroundColor: "#F0FFF4",
              borderRadius: "0.25rem",
            }}
          >
            <p style={{ fontWeight: "bold", fontSize: "1.25rem" }}>
              {formatCurrency(totalNetIncome)}
            </p>
            <p>Net Income</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const JournalEntryView = ({ journalEntries, properties }) => {
  if (properties.length === 0 || journalEntries.length === 0) return null;

  const generateJournalNo = (date) => {
    const [month, day, year] = date.split("/");
    return `${year}${month}${day}Rent`;
  };

  const validEntries = journalEntries.filter(
    (entry) =>
      entry.Date &&
      entry.Account &&
      entry.Description &&
      (parseFloat(entry.Debit) > 0 || parseFloat(entry.Credit) > 0) &&
      properties.some((prop) => entry.Description.includes(prop.name))
  );

  if (validEntries.length === 0) {
    return null;
  }

  const columns = [
    { key: "journalNo", label: "Journal No.", align: "left" },
    { key: "date", label: "Journal Date", align: "left" },
    { key: "account", label: "Account", align: "left" },
    { key: "description", label: "Description", align: "left" },
    { key: "debit", label: "Debits", align: "right" },
    { key: "credit", label: "Credits", align: "right" },
    { key: "class", label: "Class", align: "left" },
  ];

  return (
    <Card style={{ marginTop: "2rem" }}>
      <CardHeader>
        <CardTitle>Real-Time Journal Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f7fafc" }}>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      textAlign: column.align,
                      padding: "0.5rem",
                      fontWeight: "bold",
                      borderBottom: "2px solid #e2e8f0",
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {validEntries.map((entry, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? "white" : "#f7fafc",
                  }}
                >
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {generateJournalNo(entry.Date)}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {entry.Date}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {entry.Account}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {entry.Description}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #e2e8f0",
                      textAlign: "right",
                    }}
                  >
                    {parseFloat(entry.Debit) > 0 ? entry.Debit : ""}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #e2e8f0",
                      textAlign: "right",
                    }}
                  >
                    {parseFloat(entry.Credit) > 0 ? entry.Credit : ""}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {entry.Class}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyManagementApp;
