<?php
/**
 * Plugin Name: EDD Data Exporter (v4 - DIAGNÓSTICO)
 * Description: Exportador con diagnóstico para encontrar las llaves de Stripe/PayPal
 * Version: 4.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V4 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v4', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v4', 'EDD Export v4', 'manage_options', 'edd-data-exporter-v4', [$this, 'admin_page'], 'dashicons-id', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🔍 Diagnóstico Exhaustivo de Pedidos (v4)</h1>
            <p>Este exportador no solo descarga los datos, sino que analiza TODA la metadata de los primeros 10 pedidos para que podamos ver dónde están guardados los IDs realmente.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v4">
                <?php wp_nonce_field('export_edd_data_v4', 'export_nonce'); ?>
                <?php submit_button('🚀 Generar Exportación con Diagnóstico'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v4', 'export_nonce');
        
        global $wpdb;
        
        $diag = [
            'tables' => $wpdb->get_col("SHOW TABLES LIKE '{$wpdb->prefix}edd_%'"),
            'orders_sample' => $this->export_orders_with_all_meta(10),
        ];
        
        $json = json_encode($diag, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-diag-v4-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
    
    private function export_orders_with_all_meta($limit = 10) {
        global $wpdb;
        $data = [];
        
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}edd_orders'");
        
        if ($table_exists) {
            $orders = $wpdb->get_results("SELECT o.*, c.email as c_email FROM {$wpdb->prefix}edd_orders o LEFT JOIN {$wpdb->prefix}edd_customers c ON o.customer_id = c.id ORDER BY o.id DESC LIMIT $limit");
            foreach ($orders as $order) {
                // Obtener TODA la meta de este pedido
                $meta = $wpdb->get_results($wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d", $order->id));
                $all_meta = [];
                foreach ($meta as $m) {
                    $all_meta[$m->meta_key] = $m->meta_value;
                }

                // También buscar en postmeta por si acaso (para pedidos migrados)
                $post_id = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d AND meta_key = '_edd_payment_id'", $order->id));
                if ($post_id) {
                    $pmeta = get_post_custom($post_id);
                    $all_meta['__post_meta_context'] = $pmeta;
                }
                
                $data[] = [
                    'order_number' => $order->order_number,
                    'payment_method' => $order->gateway,
                    'transaction_id' => $order->transaction_id,
                    'status' => $order->status,
                    'all_metadata' => $all_meta
                ];
            }
        } else {
            // EDD 2.x
            $orders = get_posts(['post_type' => 'edd_payment', 'posts_per_page' => $limit, 'post_status' => 'any']);
            foreach ($orders as $order) {
                $data[] = [
                    'order_number' => get_post_meta($order->ID, '_edd_payment_number', true),
                    'payment_method' => get_post_meta($order->ID, '_edd_payment_gateway', true),
                    'all_metadata' => get_post_custom($order->ID)
                ];
            }
        }
        return $data;
    }
}
new EDD_Data_Exporter_V4();
