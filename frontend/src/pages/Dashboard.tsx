import {
    Box,
    Grid,
    GridItem,
    Heading,
} from "@chakra-ui/react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data - replace with real data later
const mockStats = {
    totalClients: 156,
    messagesSentToday: 47,
    errors: 2,
    optOuts: 3,
    pending: 12
};

const mockChartData = [
    { day: 'Mon', sent: 65 },
    { day: 'Tue', sent: 72 },
    { day: 'Wed', sent: 58 },
    { day: 'Thu', sent: 80 },
    { day: 'Fri', sent: 45 },
    { day: 'Sat', sent: 35 },
    { day: 'Sun', sent: 42 }
];

const mockActivity = [
    { time: '10:45 AM', event: 'Message sent', status: 'Success', client: 'John D.' },
    { time: '10:42 AM', event: 'Message failed', status: 'Error', client: 'Mary S.' },
    { time: '10:40 AM', event: 'Message sent', status: 'Success', client: 'Robert K.' },
];

export default function Dashboard() {
    return (
        <Box>
            <Heading mb={6}>Dashboard</Heading>

            {/* Stats Grid */}
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }} gap={4} mb={8}>
                <GridItem>
                    <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="lg">
                        <StatLabel>Total Clients</StatLabel>
                        <StatNumber>{mockStats.totalClients}</StatNumber>
                        <StatHelpText>Active in database</StatHelpText>
                    </Stat>
                </GridItem>
                <GridItem>
                    <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="lg">
                        <StatLabel>Messages Today</StatLabel>
                        <StatNumber>{mockStats.messagesSentToday}</StatNumber>
                        <StatHelpText>Last 24 hours</StatHelpText>
                    </Stat>
                </GridItem>
                <GridItem>
                    <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="lg">
                        <StatLabel>Errors</StatLabel>
                        <StatNumber color="red.500">{mockStats.errors}</StatNumber>
                        <StatHelpText>Needs attention</StatHelpText>
                    </Stat>
                </GridItem>
                <GridItem>
                    <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="lg">
                        <StatLabel>Opt-outs</StatLabel>
                        <StatNumber>{mockStats.optOuts}</StatNumber>
                        <StatHelpText>Last 7 days</StatHelpText>
                    </Stat>
                </GridItem>
                <GridItem>
                    <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="lg">
                        <StatLabel>Pending</StatLabel>
                        <StatNumber>{mockStats.pending}</StatNumber>
                        <StatHelpText>In queue</StatHelpText>
                    </Stat>
                </GridItem>
            </Grid>

            {/* Weekly Activity Chart */}
            <Card mb={8}>
                <CardBody>
                    <Heading size="md" mb={4}>Weekly Activity</Heading>
                    <Box h="300px">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="sent" stroke="#3182ce" fill="#63b3ed" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </CardBody>
            </Card>

            {/* Recent Activity Table */}
            <Card>
                <CardBody>
                    <Heading size="md" mb={4}>Recent Activity</Heading>
                    <Table variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Time</Th>
                                <Th>Event</Th>
                                <Th>Status</Th>
                                <Th>Client</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {mockActivity.map((activity, idx) => (
                                <Tr key={idx}>
                                    <Td>{activity.time}</Td>
                                    <Td>{activity.event}</Td>
                                    <Td color={activity.status === 'Error' ? 'red.500' : 'green.500'}>
                                        {activity.status}
                                    </Td>
                                    <Td>{activity.client}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </CardBody>
            </Card>
        </Box>
    );
}
