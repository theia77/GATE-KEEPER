import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/lib/theme";

function TabIcon({ shape, focused }: { shape: "square" | "bars" | "triangle" | "vault" | "circle"; focused: boolean }) {
  const c = focused ? colors.accentOrange : colors.textFaint;
  if (shape === "bars") {
    return (
      <View style={{ gap: 2.5, height: 16, justifyContent: "center" }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 16, height: 2, backgroundColor: c }} />
        ))}
      </View>
    );
  }
  if (shape === "triangle") {
    return (
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderBottomWidth: 14,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: c,
        }}
      />
    );
  }
  if (shape === "vault") {
    return <View style={{ width: 16, height: 14, borderRadius: 3, borderWidth: 2, borderColor: c }} />;
  }
  if (shape === "circle") {
    return <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: c }} />;
  }
  return <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: c }} />;
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={[styles.label, { color: focused ? colors.accentOrange : colors.textFaint }]}>{label}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "rgba(20,18,16,0.95)", borderTopColor: colors.border, height: 88, paddingTop: 8 },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <TabIcon shape="square" focused={focused} />
              <TabLabel label="HOME" focused={focused} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <TabIcon shape="bars" focused={focused} />
              <TabLabel label="QUESTS" focused={focused} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="arena"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <TabIcon shape="triangle" focused={focused} />
              <TabLabel label="ARENA" focused={focused} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <TabIcon shape="vault" focused={focused} />
              <TabLabel label="VAULT" focused={focused} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <TabIcon shape="circle" focused={focused} />
              <TabLabel label="PROFILE" focused={focused} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: "center", gap: 4 },
  label: { fontFamily: fonts.display, fontSize: 10.5, letterSpacing: 0.3 },
});
