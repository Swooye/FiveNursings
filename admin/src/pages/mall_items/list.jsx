import React from "react";
import { List, useTable, EditButton, ShowButton, DeleteButton, TextField } from "@refinedev/antd";
import { Table, Space, Image, Switch, message } from "antd";
import { useUpdate } from "@refinedev/core";

export const MallItemList = () => {
    const { tableProps } = useTable();
    const { mutate } = useUpdate();

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
            <Table {...tableProps} rowKey="id">
                <Table.Column 
                    dataIndex="imageUrl" 
                    title="预览" 
                    render={(value) => (
                        <Image 
                            src={value} 
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
