import { useState } from "react";
import { MenuItem, TextField } from "@mui/material";
import { ologApi } from "api/ologApi";

const TemplateSelect = ({ onChange, control, className }) => {
  const [selectedValue, setSelectedValue] = useState("");
  const { data: logbookTemplates = [], isLoading } =
    ologApi.endpoints.getTemplates.useQuery();

  const options = logbookTemplates.map((template) => ({
    value: template.id,
    label: template.name,
    source: template.source
  }));

  return (
    <TextField
      name="templateTypeSelect"
      label="Templates"
      value={selectedValue}
      variant="outlined"
      control={control}
      className={className}
      isLoading={isLoading}
      select
      onChange={(event) => {
        const newValue = event.target.value;
        setSelectedValue(newValue);
        const selectedTemplate = options.find(
          (option) => option.value === newValue
        );

        if (onChange) {
          onChange(selectedTemplate?.source || "");
        }
      }}
    >
      {options.map((option) => (
        <MenuItem
          key={option.value}
          value={option.value}
        >
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default TemplateSelect;
