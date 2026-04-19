import { Ionicons } from "@expo/vector-icons";
import React, { createContext, ReactNode, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import type {
  IButton,
  IAppEmptyStateProps,
  IEmptyContent,
  IEmptyContextValue,
  IEmptyDescription,
  IEmptyHeader,
  IEmptyMedia,
  IEmptyProps,
  IEmptyTitle,
} from "./types";

const EmptyContext = createContext<IEmptyContextValue | undefined>(undefined);

export const AppEmptyState: React.FC<IAppEmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <Empty style={style}>
      <EmptyHeader>
        <EmptyMedia>
          {icon || <Ionicons name="file-tray-outline" size={34} color="#737373" />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {actionLabel && onAction ? (
        <EmptyContent>
          <EmptyButton onPress={onAction}>{actionLabel}</EmptyButton>
        </EmptyContent>
      ) : null}
    </Empty>
  );
};

// ==================== EMPTY COMPONENT ====================

export const Empty: React.FC<IEmptyProps> = ({
  children,
  variant = "default",
  style,
}) => {
  const contextValue = useMemo<IEmptyContextValue>(
    () => ({
      variant,
    }),
    [variant],
  );

  return (
    <EmptyContext.Provider value={contextValue}>
      <View
        style={[
          styles.empty,
          variant === "outline" && styles.emptyOutline,
          style,
        ]}
      >
        {children}
      </View>
    </EmptyContext.Provider>
  );
};

// ==================== EMPTY HEADER ====================

export const EmptyHeader: React.FC<IEmptyHeader> = ({ children, style }) => {
  return <View style={[styles.emptyHeader, style]}>{children}</View>;
};

// ==================== EMPTY MEDIA ====================

export const EmptyMedia: React.FC<IEmptyMedia> = ({
  children,
  variant = "icon",
  style,
}) => {
  return (
    <View
      style={[
        styles.emptyMedia,
        variant === "icon" && styles.emptyMediaIcon,
        style,
      ]}
    >
      {children}
    </View>
  );
};

// ==================== EMPTY TITLE ====================

export const EmptyTitle: React.FC<IEmptyTitle> = ({ children, style }) => {
  return <Text style={[styles.emptyTitle, style]}>{children}</Text>;
};

// ==================== EMPTY DESCRIPTION ====================

export const EmptyDescription: React.FC<IEmptyDescription> = ({
  children,
  style,
}) => {
  return <Text style={[styles.emptyDescription, style]}>{children}</Text>;
};

// ==================== EMPTY CONTENT ====================

export const EmptyContent: React.FC<IEmptyContent> = ({ children, style }) => {
  return <View style={[styles.emptyContent, style]}>{children}</View>;
};

// ==================== BUTTON COMPONENT ====================

export const EmptyButton: React.FC<IButton> = ({
  children,
  variant = "default",
  size = "md",
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === "outline" && styles.buttonOutline,
        size === "sm" && styles.buttonSm,
        size === "md" && styles.buttonMd,
        size === "lg" && styles.buttonLg,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {typeof children === "string" ? (
        <Text
          style={[
            styles.buttonText,
            variant === "outline" && styles.buttonTextOutline,
            size === "sm" && styles.buttonTextSm,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

// ==================== ICON CLOUD COMPONENT ====================
const styles = StyleSheet.create({
  empty: {
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
  } as ViewStyle,
  emptyOutline: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderStyle: "dashed",
  } as ViewStyle,

  // Empty header
  emptyHeader: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  } as ViewStyle,

  // Empty media
  emptyMedia: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  emptyMediaIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  // Empty title
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#171717",
    marginBottom: 10,
    textAlign: "center",
  } as TextStyle,

  // Empty description
  emptyDescription: {
    fontSize: 15,
    color: "#737373",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  } as TextStyle,

  // Empty content
  emptyContent: {
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  // Button base
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
  } as ViewStyle,
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#d4d4d4",
  } as ViewStyle,

  // Button sizes
  buttonSm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  } as ViewStyle,
  buttonMd: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  } as ViewStyle,
  buttonLg: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  } as ViewStyle,

  // Button text
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ffffff",
  } as TextStyle,
  buttonTextOutline: {
    color: "#171717",
  } as TextStyle,
  buttonTextSm: {
    fontSize: 12,
  } as TextStyle,
});
