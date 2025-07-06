import { Stack, Typography } from "@mui/material";
import { useShow } from "@refinedev/core";
import { DateField, Show, TextFieldComponent as TextField } from "@refinedev/mui";

export const Test1Show = () => {
  const { queryResult } = useShow({
    meta: {
      select: "*",
    },
  });
  const { data, isLoading } = queryResult;

  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Stack gap={1}>
        <Typography variant="body1" fontWeight="bold">
          ID
        </Typography>
        <TextField value={record?.id} />
        <Typography variant="body1" fontWeight="bold">
          Title
        </Typography>
        <TextField value={record?.title} />
        <Typography variant="body1" fontWeight="bold">
          Description
        </Typography>
        <TextField value={record?.description} />
        <Typography variant="body1" fontWeight="bold">
          Created at
        </Typography>
        <DateField value={record?.createdAt} />
      </Stack>
    </Show>
  );
}; 