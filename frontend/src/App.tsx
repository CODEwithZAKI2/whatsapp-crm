import React, { useState } from "react";
import {
    ChakraProvider,
    Box,
    Flex,
    IconButton,
    useColorMode,
    Button,
    VStack,
    Text,
    ColorModeScript,
    extendTheme,
} from "@chakra-ui/react";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";

// Import page stubs
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Templates from "./pages/Templates";
import Scheduler from "./pages/Scheduler";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";

const NAV_ITEMS = [
    { label: "Dashboard", key: "dashboard" },
    { label: "Clients", key: "clients" },
    { label: "Templates", key: "templates" },
    { label: "Scheduler", key: "scheduler" },
    { label: "Logs", key: "logs" },
    { label: "Settings", key: "settings" },
];

function Sidebar({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) {
    return (
        <VStack align="stretch" spacing={2} p={4} bg="gray.800" color="white" minH="100vh">
            <Text fontWeight="bold" fontSize="xl" mb={6}>
                WhatsApp CRM
            </Text>
            {NAV_ITEMS.map((item) => (
                <Button
                    key={item.key}
                    variant={selected === item.key ? "solid" : "ghost"}
                    colorScheme="teal"
                    justifyContent="flex-start"
                    onClick={() => onSelect(item.key)}
                >
                    {item.label}
                </Button>
            ))}
        </VStack>
    );
}

function Topbar() {
    const { colorMode, toggleColorMode } = useColorMode();
    return (
        <Flex justify="flex-end" align="center" p={4} bg="gray.100">
            <IconButton
                aria-label="Toggle theme"
                icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                mr={2}
            />
            {/* User info, notifications, etc. can go here */}
        </Flex>
    );
}

function MainContent({ selected }: { selected: string }) {
    switch (selected) {
        case "dashboard":
            return <Dashboard />;
        case "clients":
            return <Clients />;
        case "templates":
            return <Templates />;
        case "scheduler":
            return <Scheduler />;
        case "logs":
            return <Logs />;
        case "settings":
            return <Settings />;
        default:
            return <Dashboard />;
    }
}

// Add a theme (optional, but recommended for color mode)
const theme = extendTheme({
    config: {
        initialColorMode: "light",
        useSystemColorMode: false,
    },
});

export default function App() {
    const [selected, setSelected] = useState("dashboard");
    return (
        <>
            <ColorModeScript initialColorMode={theme.config.initialColorMode} />
            <ChakraProvider theme={theme}>
                <Flex>
                    <Sidebar selected={selected} onSelect={setSelected} />
                    <Box flex="1">
                        <Topbar />
                        <Box p={6}>
                            <MainContent selected={selected} />
                        </Box>
                    </Box>
                </Flex>
            </ChakraProvider>
        </>
    );
}
