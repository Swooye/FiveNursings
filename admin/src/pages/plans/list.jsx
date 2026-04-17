import { List, useTable, ShowButton } from "@refinedev/antd";
import { Table, Tag, Space, Typography, Form, Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

export const PlanList = () => {
    const { tableProps, setFilters } = useTable({ syncWithLocation: true });
    const [form] = Form.useForm();

    const handleSearch = () => {
        const { patientName, cancerType } = form.getFieldsValue();
        const filters = [];
        if (patientName?.trim()) filters.push({ field: "name", operator: "contains", value: patientName.trim() });
        if (cancerType?.trim()) filters.push({ field: "cancerType", operator: "contains", value: cancerType.trim() });
        setFilters(filters, "replace");
    };

    return (
        <List title="康复计划概览 (按用户分组)">
            <Form form={form} layout="inline" style={{ marginBottom: "16px" }}>
                <Form.Item name="patientName">
                    <Input placeholder="搜索患者姓名" prefix={<SearchOutlined />} allowClear />
                </Form.Item>
                <Form.Item name="cancerType">
                    <Input placeholder="搜索癌种" prefix={<SearchOutlined />} allowClear />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" onClick={handleSearch}>搜索</Button>
                </Form.Item>
            </Form>
            <Table {...tableProps} rowKey="id">
                <Table.Column
                    dataIndex="firebaseUid"
                    title="用户ID"
                    render={(val) => <Text copyable ellipsis={{ tooltip: val }} style={{ width: 80 }}>{val}</Text>}
                />
                <Table.Column
                    dataIndex="name"
                    title="患者姓名"
                    render={(val, record) => val || record.nickname || "新用户"}
                />
                <Table.Column dataIndex="cancerType" title="癌种" />
                <Table.Column dataIndex="stage" title="康复阶段" />
                <Table.Column
                    dataIndex="coreRecoveryIndex"
                    title="核心康复指数"
                    render={(val) => {
                        let color = "green";
                        if (val < 60) color = "red";
                        else if (val < 80) color = "orange";
                        return <Tag color={color} style={{ fontWeight: 'bold' }}>{val || 0} 分</Tag>;
                    }}
                />
                <Table.Column
                    title="操作"
                    render={(_, record) => (
                        <Space>
                            <ShowButton hideText size="small" recordItemId={record.id} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
