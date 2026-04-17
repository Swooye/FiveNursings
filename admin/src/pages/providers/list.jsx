import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { Table, Space, Tag, Typography, Form, Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

export const ProviderList = () => {
    const { tableProps, setFilters } = useTable({ syncWithLocation: true });
    const [form] = Form.useForm();

    const handleSearch = () => {
        const { name, contactName } = form.getFieldsValue();
        const filters = [];
        if (name?.trim()) filters.push({ field: "name", operator: "contains", value: name.trim() });
        if (contactName?.trim()) filters.push({ field: "contactName", operator: "contains", value: contactName.trim() });
        setFilters(filters, "replace");
    };

    return (
        <List>
            <Form form={form} layout="inline" style={{ marginBottom: "16px" }}>
                <Form.Item name="name">
                    <Input placeholder="搜索机构名称" prefix={<SearchOutlined />} allowClear />
                </Form.Item>
                <Form.Item name="contactName">
                    <Input placeholder="搜索联系人" prefix={<SearchOutlined />} allowClear />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" onClick={handleSearch}>搜索</Button>
                </Form.Item>
            </Form>
            <Table {...tableProps} rowKey="id">
                <Table.Column dataIndex="name" title="机构名称" fixed="left" />
                <Table.Column 
                    title="地理位置" 
                    render={(_, record) => (
                        <div style={{ maxWidth: 250 }}>
                            <Text strong>{record.province}{record.city}{record.district}</Text>
                            <br />
                            <Text type="secondary" size="small">{record.address}</Text>
                        </div>
                    )}
                />
                <Table.Column 
                    title="联系信息" 
                    render={(_, record) => (
                        <div>
                            <div>{record.contactName}</div>
                            <Text type="secondary">{record.contactPhone}</Text>
                        </div>
                    )}
                />
                <Table.Column 
                    dataIndex="services" 
                    title="服务项" 
                    render={(value) => (
                        <Space wrap>
                            {value?.map((service) => (
                                <Tag color="blue" key={service}>
                                    {service}
                                </Tag>
                            ))}
                        </Space>
                    )}
                />
                <Table.Column dataIndex="expertName" title="签约专家" />
                <Table.Column 
                    title="操作"
                    width={100}
                    fixed="right"
                    render={(_, record) => {
                        const stringId = record.id?.toString() || record._id?.toString();
                        return (
                            <Space>
                                <EditButton hideText size="small" recordItemId={stringId} />
                                <DeleteButton hideText size="small" recordItemId={stringId} />
                            </Space>
                        );
                    }}
                />
            </Table>
        </List>
    );
};
