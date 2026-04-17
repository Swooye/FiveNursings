import { List, useTable, EditButton, ShowButton, DeleteButton } from "@refinedev/antd";
import { Table, Space, Form, Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";

export const UserList = () => {
    const { tableProps, setFilters } = useTable({ syncWithLocation: true });
    const [form] = Form.useForm();

    const handleSearch = () => {
        const { name, phoneNumber } = form.getFieldsValue();
        const filters = [];
        if (name?.trim()) filters.push({ field: "name", operator: "contains", value: name.trim() });
        if (phoneNumber?.trim()) filters.push({ field: "phoneNumber", operator: "contains", value: phoneNumber.trim() });
        setFilters(filters, "replace");
    };

    return (
        <List>
            <Form form={form} layout="inline" style={{ marginBottom: "16px" }}>
                <Form.Item name="name">
                    <Input placeholder="输入姓名搜索" prefix={<SearchOutlined />} allowClear />
                </Form.Item>
                <Form.Item name="phoneNumber">
                    <Input placeholder="输入手机号搜索" prefix={<SearchOutlined />} allowClear />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" onClick={handleSearch}>搜索</Button>
                </Form.Item>
            </Form>
            <Table {...tableProps} rowKey="id">
                <Table.Column
                    dataIndex="id"
                    title="ID"
                    render={(value) => <span>{value?.toString()}</span>}
                />
                <Table.Column dataIndex="name" title="姓名" />
                <Table.Column dataIndex="nickname" title="昵称" />
                <Table.Column dataIndex="phoneNumber" title="手机号" />
                <Table.Column dataIndex="cancerType" title="癌种" />
                <Table.Column dataIndex="stage" title="康复阶段" />
                <Table.Column
                    title="操作"
                    render={(_, record) => (
                        <Space>
                            <EditButton hideText size="small" recordItemId={record.id} />
                            <ShowButton hideText size="small" recordItemId={record.id} />
                            <DeleteButton hideText size="small" recordItemId={record.id} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
