import { Stack } from "expo-router";
import React from "react";

export default function CampaignsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "קמפיינים",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
