import React from "react";
import { List, useTable, EditButton, ShowButton, DeleteButton, TextField, NumberField } from "@refinedev/antd";
import { Table, Space, Tag, Image, Switch, message } from "antd";
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
        }, {
            onSuccess: () => {
                message.success(checked ? "商品已上架" : "商品已下架");
            }
        });
    };

    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column 
                    dataIndex="imageUrl" 
                    title="预览" 
                    render={(value) => <Image src={value} width={40} height={40} style={{ objectFit: 'cover', borderRadius: '4px' }} />}
                />
                <Table.Column dataIndex="name" title="商品名称" />
                <Table.Column dataIndex="category" title="分类" />
                <Table.Column 
                    dataIndex="price" 
                    title="售价" 
                    render={(value) => <TextField value={`￥${value}`} />} 
                />
                <Table.Column dataIndex="stock" title="库存" />
                <Table.Column dataIndex="sales" title="累计销量" />
                <Table.Column 
                    dataIndex="status" 
                    title="上架状态" 
                    render={(value, record) => (
                        <Switch 
                            checked={value === "on_sale"} 
                            onChange={(checked) => handleStatusChange(record.id, checked)}
                            checkedChildren="售卖中"
                            unCheckedChildren="已下架"
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
