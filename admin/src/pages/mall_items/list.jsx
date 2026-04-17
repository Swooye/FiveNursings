import { List, useTable, EditButton, ShowButton, DeleteButton, TextField } from "@refinedev/antd";
import { Table, Space, Image, Switch, Form, Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useUpdate } from "@refinedev/core";
import { getAssetUrl } from "../../utils/image";

export const MallItemList = () => {
    const { tableProps, setFilters } = useTable({ syncWithLocation: true });
    const { mutate } = useUpdate();
    const [form] = Form.useForm();

    const handleSearch = () => {
        const { name, category } = form.getFieldsValue();
        const filters = [];
        if (name?.trim()) filters.push({ field: "name", operator: "contains", value: name.trim() });
        if (category?.trim()) filters.push({ field: "category", operator: "contains", value: category.trim() });
        setFilters(filters, "replace");
    };

    const handleStatusChange = (id, checked) => {
        mutate({
            resource: "mall_items",
            id: id,
            values: { status: checked ? "on_sale" : "off_sale" },
            mutationMode: "optimistic",
        });
    };

    return (
        <List>
            <Form form={form} layout="inline" style={{ marginBottom: "16px" }}>
                <Form.Item name="name">
                    <Input placeholder="搜索商品名称" prefix={<SearchOutlined />} allowClear />
                </Form.Item>
                <Form.Item name="category">
                    <Input placeholder="搜索分类" prefix={<SearchOutlined />} allowClear />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" onClick={handleSearch}>搜索</Button>
                </Form.Item>
            </Form>
            <Table {...tableProps} rowKey="id">
                <Table.Column 
                    dataIndex="imageUrl" 
                    title="预览" 
                    render={(value) => (
                        <Image 
                            src={getAssetUrl(value)} 
                            width={50} 
                            height={50} 
                            style={{ objectFit: 'cover', borderRadius: '8px' }} 
                            fallback="https://via.placeholder.com/50?text=无图"
                        />
                    )}
                />
                <Table.Column dataIndex="name" title="商品名称" />
                <Table.Column dataIndex="category" title="分类" />
                <Table.Column 
                    dataIndex="price" 
                    title="售价" 
                    render={(value) => <TextField value={`￥${value}`} />} 
                />
                <Table.Column dataIndex="stock" title="库存" />
                <Table.Column 
                    dataIndex="status" 
                    title="状态" 
                    render={(value, record) => (
                        <Switch 
                            checked={value === "on_sale"} 
                            onChange={(checked) => handleStatusChange(record.id, checked)}
                            checkedChildren="上架"
                            unCheckedChildren="下架"
                        />
                    )}
                />
                <Table.Column 
                    title="操作"
                    render={(_, record) => {
                        // 强制获取字符串 ID
                        const stringId = record.id?.toString() || record._id?.toString();
                        return (
                            <Space>
                                <EditButton hideText size="small" recordItemId={stringId} />
                                <ShowButton hideText size="small" recordItemId={stringId} />
                                <DeleteButton hideText size="small" recordItemId={stringId} />
                            </Space>
                        );
                    }}
                />
            </Table>
        </List>
    );
};
