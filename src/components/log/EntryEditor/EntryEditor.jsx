/**
 * Copyright (C) 2019 European Spallation Source ERIC.
 * <p>
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * <p>
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * <p>
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

import { useEffect, useRef, useState } from "react";
import { Button, Stack, Typography } from "@mui/material";
import { Description } from "./Description";
import { TextInput } from "components/shared/input/TextInput";
import LogbooksMultiSelect from "components/shared/input/managed/LogbooksMultiSelect";
import TagsMultiSelect from "components/shared/input/managed/TagsMultiSelect";
import EntryTypeSelect from "components/shared/input/managed/EntryTypeSelect";
import { PropertyCollectionInput } from "components/shared/input/managed/PropertyCollectionInput";

import TemplateSelect from "components/shared/input/managed/TemplateSelect";

export const EntryEditor = ({
  form,
  title,
  onSubmit,
  submitDisabled,
  attachmentsDisabled
}) => {
  const topElem = useRef();
  const { control, handleSubmit, formState } = form;
  const [selectedSource, setSelectedSource] = useState("");

  // Scroll to top if there are field errors
  useEffect(() => {
    if (Object.keys(formState.errors).length > 0) {
      if (
        topElem.current &&
        typeof topElem.current.scrollIntoView === "function"
      ) {
        topElem.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [formState]);

  return (
    <Stack
      gap={1}
      px={4}
      pb={4}
      pt={2}
      maxWidth="1000px"
      margin="0 auto"
      width="100%"
      height="fit-content"
    >
      <Typography
        component="h2"
        variant="h3"
        py={2}
      >
        {title}
      </Typography>
      <Stack
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        gap={2}
      >
        <span ref={topElem} />
        <TemplateSelect
          rules={{
            validate: {
              notEmpty: (val) => val?.length > 0 || "Please select a template"
            }
          }}
          control={control}
          onChange={(template) => {
            // Cerca il template selezionato usando il suo ID
            const selectedTemplate = template;

            // Se esiste, aggiorna lo stato con il valore `source`
            setSelectedSource(selectedTemplate || "");
          }}
        />
        <LogbooksMultiSelect
          control={control}
          rules={{
            validate: {
              notEmpty: (val) =>
                val?.length > 0 || "Select at least one logbook"
            }
          }}
        />
        <TagsMultiSelect control={control} />
        <EntryTypeSelect
          rules={{
            validate: {
              notEmpty: (val) =>
                val?.length > 0 || "Please select an Entry Type"
            }
          }}
          control={control}
        />
        <TextInput
          name="title"
          label="Title"
          control={control}
          defaultValue=""
          rules={{
            required: {
              value: true,
              message: "Please specify a title."
            }
          }}
        />
        <Description
          form={form}
          attachmentsDisabled={attachmentsDisabled}
          selectedSource={selectedSource}
        />
        <PropertyCollectionInput control={control} />
        <Button
          type="submit"
          variant="contained"
          disabled={submitDisabled}
          sx={{ marginBottom: 4 }}
        >
          Submit
        </Button>
      </Stack>
    </Stack>
  );
};
