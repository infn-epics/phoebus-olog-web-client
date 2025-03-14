import { useEffect, useState } from "react";
import { Alert, InputLabel, MenuItem, Select, Snackbar, styled, Typography } from "@mui/material";
import MultiSelect from "../MultiSelect";
import customization from "config/customization";
import { ologApi } from "api/ologApi";

const errorText =
  "Misconfigured VITE_APP_LEVEL_VALUES. Please contact your administrator.";

const TemplateSelect = ({ control, onChange }) => {
  const [selectedValue, setSelectedValue] = useState("");
  const { data: logbookTemplates = [] } = ologApi.endpoints.getTemplates.useQuery();

  const options = logbookTemplates.map((template) => ({
    value: template.id,  // Usa l'ID del template come valore
    label: template.name,
    source: template.source
  }));

  return (
    <Select
      name="templateTypeSelect"
      label="Templates"
      value={selectedValue}
      onChange={(event) => {
        const newValue = event.target.value;
        setSelectedValue(newValue);
        const selectedTemplate = options.find(option => option.value === newValue);

        if (onChange) {
          onChange(selectedTemplate?.source || "");
        }
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
};



export default TemplateSelect;
